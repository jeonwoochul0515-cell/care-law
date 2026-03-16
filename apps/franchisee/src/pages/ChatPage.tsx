import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { functions, supabase, CASE_TYPE_LABELS } from '@care-law/shared';
import type { CaseType, Message } from '@care-law/shared';
import { useBrandStore } from '../store/brandStore';
import { useAuthStore }  from '../store/authStore';
import { FaArrowLeft, FaPaperPlane, FaCalendarAlt, FaPaperclip, FaCamera } from 'react-icons/fa';

const chatWithAI  = httpsCallable(functions, 'chatWithAI');
const classifyCase = httpsCallable(functions, 'classifyCase');
const analyzeAttachmentFn = httpsCallable(functions, 'analyzeAttachment');

/** HH:mm 형식 타임스탬프 */
function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
}

/** 낙관적 사용자 메시지용 임시 ID 접두사 */
const TEMP_PREFIX = '__temp__';

export default function ChatPage() {
  const { caseId: paramCaseId }    = useParams<{ caseId?: string }>();
  const [searchParams]              = useSearchParams();
  const navigate                    = useNavigate();
  const { brand }                   = useBrandStore();
  const { user, claims }            = useAuthStore();

  // 서버에서 확인된 메시지
  const [messages, setMessages]     = useState<Message[]>([]);
  // 낙관적으로 추가한 사용자 메시지 (아직 서버 확인 전)
  const [tempMessages, setTempMessages] = useState<Message[]>([]);
  // 중복 방지용 seen ID Set (ref로 리렌더 없이 관리)
  const seenIdsRef = useRef<Set<string>>(new Set());

  const [input, setInput]           = useState('');
  const [aiTyping, setAiTyping]     = useState(false);
  const [sendError, setSendError]   = useState('');
  const [caseError, setCaseError]   = useState('');
  const [caseId, setCaseId]         = useState(paramCaseId ?? '');
  const [showAttach, setShowAttach] = useState(false);
  const caseType = (searchParams.get('type') as CaseType) ?? 'other';
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // 합쳐진 메시지 목록: 서버 메시지 + 아직 서버에 안 나타난 temp 메시지
  const allMessages = [...messages, ...tempMessages];

  // ── 케이스 생성 ──────────────────────────────────
  useEffect(() => {
    if (caseId || !user || !claims?.brand_id) return;
    const init = async () => {
      const { data, error } = await supabase.from('carelaw_cases').insert({
        user_uid: user.uid,
        brand_id: claims.brand_id!,
        type:     caseType,
        status:   'open',
        title:    CASE_TYPE_LABELS[caseType] + ' 상담',
      }).select().single();
      if (error) { setCaseError('상담 케이스 생성에 실패했습니다. 다시 시도해주세요.'); return; }
      if (data) setCaseId(data.id);
    };
    init();
  }, [user, claims, caseId, caseType]);

  // ── Realtime 메시지 처리 콜백 ──────────────────
  const handleRealtimeInsert = useCallback((payload: { new: Record<string, unknown> }) => {
    const newMsg = payload.new as unknown as Message;

    // 이미 본 메시지면 무시 (dedup)
    if (seenIdsRef.current.has(newMsg.id)) return;
    seenIdsRef.current.add(newMsg.id);

    // 서버 확인된 메시지 목록에 추가
    setMessages(prev => {
      if (prev.some(m => m.id === newMsg.id)) return prev;
      return [...prev, newMsg];
    });

    // user 메시지가 서버에서 왔으면 해당 temp 메시지 제거
    if (newMsg.role === 'user') {
      setTempMessages(prev => prev.filter(t => t.content !== newMsg.content));
    }

    // AI 응답이 도착하면 타이핑 인디케이터 제거
    if (newMsg.role === 'assistant') {
      setAiTyping(false);
    }
  }, []);

  // ── 초기 메시지 로드 → Realtime 구독 (순서 보장) ──
  useEffect(() => {
    if (!caseId) return;

    let cancelled = false;

    const setup = async () => {
      // 1) 초기 메시지 로드
      const { data } = await supabase
        .from('carelaw_messages')
        .select('*')
        .eq('case_id', caseId)
        .order('created_at', { ascending: true });

      if (cancelled) return;

      const initialMessages = data ?? [];

      // seen IDs 세팅
      seenIdsRef.current = new Set(initialMessages.map(m => m.id));
      setMessages(initialMessages);

      // 2) 초기 로드 완료 후 Realtime 구독 시작
      const channel = supabase
        .channel(`messages:${caseId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'carelaw_messages',
          filter: `case_id=eq.${caseId}`,
        }, handleRealtimeInsert)
        .subscribe();

      channelRef.current = channel;
    };

    setup();

    return () => {
      cancelled = true;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [caseId, handleRealtimeInsert]);

  // ── 자동 스크롤 ─────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [allMessages.length, aiTyping]);

  // ── 메시지 전송 (낙관적 UI) ─────────────────────
  const sendMessage = async () => {
    const text = input.trim();
    if (!text || !caseId) return;

    setInput('');
    setSendError('');

    // 1) 즉시 화면에 사용자 메시지 표시 (낙관적)
    const tempMsg: Message = {
      id:         TEMP_PREFIX + Date.now(),
      case_id:    caseId,
      role:       'user',
      content:    text,
      created_at: new Date().toISOString(),
    };
    setTempMessages(prev => [...prev, tempMsg]);

    // 2) AI 타이핑 인디케이터 표시
    setAiTyping(true);

    // 3) 첫 메시지면 케이스 분류 (fire-and-forget)
    if (messages.length === 0 && tempMessages.length === 0) {
      classifyCase({ caseId, firstMessage: text }).catch(() => {});
    }

    // 4) chatWithAI 호출
    try {
      await chatWithAI({ caseId, message: text });
      // 성공 시: Realtime이 user msg + AI msg를 push 해줌
      // → handleRealtimeInsert에서 temp 제거 + aiTyping 해제
    } catch (err) {
      console.error(err);
      // 실패 시: temp 메시지 제거, 입력 복원
      setTempMessages(prev => prev.filter(t => t.id !== tempMsg.id));
      setAiTyping(false);
      setInput(text);
      setSendError('메시지 전송에 실패했습니다. 다시 시도해주세요.');
    }
  };

  // ── 파일 첨부 전송 ──────────────────────────────
  const sendAttachment = async (file: File) => {
    if (!caseId) return;
    setShowAttach(false);
    setSendError('');

    // base64 변환
    const base64 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.readAsDataURL(file);
    });

    // 낙관적 UI
    const tempMsg: Message = {
      id: TEMP_PREFIX + Date.now(),
      case_id: caseId,
      role: 'user',
      content: `📎 [첨부파일: ${file.name}]`,
      created_at: new Date().toISOString(),
    };
    setTempMessages(prev => [...prev, tempMsg]);
    setAiTyping(true);

    try {
      await analyzeAttachmentFn({
        caseId,
        base64,
        fileName: file.name,
        contentType: file.type,
        userMessage: input.trim() || undefined,
      });
      setInput('');
    } catch (err) {
      console.error(err);
      setTempMessages(prev => prev.filter(t => t.id !== tempMsg.id));
      setAiTyping(false);
      setSendError('파일 전송에 실패했습니다.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) sendAttachment(file);
    e.target.value = '';
  };

  const brandColor = brand?.primary_color ?? '#1E2D4E';

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* ── 헤더 ── */}
      <header className="text-white px-4 pt-12 pb-3 flex items-center gap-3"
              style={{ background: brandColor }}>
        <button onClick={() => navigate(-1)} className="p-2 -ml-2">
          <FaArrowLeft className="text-white/80" />
        </button>
        <div className="flex-1 flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#C9A84C] flex items-center justify-center text-xs font-bold text-[#1E2D4E]">C</div>
          <div>
            <p className="font-bold text-sm">AI 법률 상담</p>
            <p className="text-white/60 text-xs">● 온라인 · 24시간</p>
          </div>
        </div>
        <button onClick={() => navigate('/booking')}
                className="flex items-center gap-1 bg-[#C9A84C] text-[#1E2D4E] text-xs font-bold px-3 py-1.5 rounded-full">
          <FaCalendarAlt className="text-xs" /> 변호사 예약
        </button>
      </header>

      {/* ── 메시지 영역 ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {caseError && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-red-500 text-sm mb-3">{caseError}</p>
              <button onClick={() => { setCaseError(''); setCaseId(''); }}
                      className="text-sm text-white px-4 py-2 rounded-xl" style={{ background: brandColor }}>
                다시 시도
              </button>
            </div>
          </div>
        )}

        {/* 빈 상태 안내 메시지 */}
        {!caseError && allMessages.length === 0 && !aiTyping && (
          <div className="flex gap-2 items-start">
            <div className="w-8 h-8 rounded-full bg-[#C9A84C] flex items-center justify-center text-xs font-bold text-[#1E2D4E] flex-shrink-0">C</div>
            <div className="bg-white rounded-2xl rounded-tl-none px-4 py-3 max-w-[80%] shadow-sm border border-gray-100">
              <p className="text-gray-800 text-sm leading-relaxed">안녕하세요! 법률 문제를 편하게 말씀해 주세요.<br />어떤 어려움이 있으신가요?</p>
              <p className="text-gray-400 text-xs mt-2">※ 이 답변은 법률 자문이 아닌 일반 정보입니다</p>
            </div>
          </div>
        )}

        {/* 메시지 목록 */}
        {allMessages.map((msg) => {
          const isUser = msg.role === 'user';
          const isTemp = msg.id.startsWith(TEMP_PREFIX);
          return (
            <div key={msg.id} className={`flex gap-2 items-end ${isUser ? 'flex-row-reverse' : ''}`}>
              {/* AI 아바타 */}
              {!isUser && (
                <div className="w-8 h-8 rounded-full bg-[#C9A84C] flex items-center justify-center text-xs font-bold text-[#1E2D4E] flex-shrink-0 self-start">C</div>
              )}
              {/* 타임스탬프 (버블 안쪽) + 메시지 */}
              <div className="flex flex-col gap-0.5" style={{ maxWidth: '80%' }}>
                <div className={`rounded-2xl px-4 py-3 shadow-sm text-sm leading-relaxed whitespace-pre-wrap ${
                  isUser
                    ? 'text-white rounded-tr-none'
                    : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'
                } ${isTemp ? 'opacity-70' : ''}`}
                  style={isUser ? { background: brandColor } : undefined}
                >
                  {msg.content.startsWith('📎') && msg.content.includes('[첨부파일:') ? (
                    <div className="flex items-center gap-2">
                      <FaPaperclip className="text-xs opacity-60" />
                      <span>{msg.content}</span>
                    </div>
                  ) : msg.content}
                </div>
                <span className={`text-[10px] text-gray-400 ${isUser ? 'text-right' : 'text-left'}`}>
                  {formatTime(msg.created_at)}
                </span>
              </div>
            </div>
          );
        })}

        {/* AI 타이핑 인디케이터 */}
        {aiTyping && (
          <div className="flex gap-2 items-end">
            <div className="w-8 h-8 rounded-full bg-[#C9A84C] flex items-center justify-center text-xs font-bold text-[#1E2D4E] flex-shrink-0 self-start">C</div>
            <div className="bg-white rounded-2xl rounded-tl-none px-4 py-3 border border-gray-100 shadow-sm">
              <div className="flex gap-1 items-center h-4">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-2 h-2 rounded-full bg-gray-300 animate-bounce"
                       style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── 첨부 메뉴 ── */}
      {showAttach && (
        <div className="bg-white border-t border-gray-100 px-4 py-3 flex gap-3">
          <button onClick={() => { setShowAttach(false); cameraRef.current?.click(); }}
                  className="flex-1 flex flex-col items-center gap-1 py-3 bg-gray-50 rounded-xl">
            <FaCamera className="text-lg" style={{ color: brandColor }} />
            <span className="text-xs text-gray-600">카메라</span>
          </button>
          <button onClick={() => { setShowAttach(false); fileRef.current?.click(); }}
                  className="flex-1 flex flex-col items-center gap-1 py-3 bg-gray-50 rounded-xl">
            <FaPaperclip className="text-lg" style={{ color: brandColor }} />
            <span className="text-xs text-gray-600">파일/사진</span>
          </button>
        </div>
      )}

      {/* ── 입력 영역 ── */}
      <div className="bg-white border-t border-gray-100 px-4 py-3">
        {sendError && (
          <p className="text-red-500 text-xs text-center mb-2">{sendError}</p>
        )}
        <div className="flex gap-2 items-end">
          <button onClick={() => setShowAttach(!showAttach)}
                  className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 bg-gray-100">
            <FaPaperclip className="text-gray-500 text-sm" />
          </button>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="법률 문제를 입력하세요..."
            rows={1}
            className="flex-1 resize-none bg-gray-50 rounded-2xl px-4 py-3 text-sm outline-none border border-gray-200 max-h-32"
          />
          <button onClick={sendMessage} disabled={!input.trim()}
                  className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-40"
                  style={{ background: brandColor }}>
            <FaPaperPlane className="text-[#C9A84C] text-sm" />
          </button>
        </div>
        <input ref={fileRef} type="file" accept="image/*,.pdf" onChange={handleFileChange} className="hidden" />
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />
      </div>
    </div>
  );
}
