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

  const Avatar = () => (
    <div className="w-8 h-8 rounded-full bg-gold-soft flex items-center justify-center flex-shrink-0 self-start"
         aria-hidden>
      <span className="cl-display text-gold text-sm leading-none">곁</span>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-paper">
      {/* ── 헤더 (아이보리 + 금색 아바타) ── */}
      <header className="bg-paper-raised border-b border-line safe-top">
        <div className="px-3 pb-3 flex items-center gap-2">
          <button onClick={() => navigate(-1)} aria-label="뒤로 가기"
                  className="w-10 h-10 flex items-center justify-center rounded-lg text-ink-soft hover:bg-paper-sunken transition-colors">
            <FaArrowLeft />
          </button>
          <div className="flex-1 flex items-center gap-2.5 min-w-0">
            <Avatar />
            <div className="min-w-0">
              <p className="font-semibold text-sm text-ink">AI 법률 도우미</p>
              <p className="text-ink-mute text-xs flex items-center gap-1.5">
                <span className="cl-dot bg-success" aria-hidden /> 언제든 함께해요
              </p>
            </div>
          </div>
          <button onClick={() => navigate('/booking')}
                  className="cl-btn cl-btn-gold cl-btn-sm flex-shrink-0">
            <FaCalendarAlt className="text-xs" aria-hidden /> 변호사 예약
          </button>
        </div>
      </header>

      {/* ── 메시지 영역 ── */}
      <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-3.5">
        {caseError && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center px-6">
              <p className="text-ink-soft text-sm mb-4 leading-relaxed" role="alert">{caseError}</p>
              <button onClick={() => { setCaseError(''); setCaseId(''); }}
                      className="cl-btn cl-btn-primary">
                다시 시도하기
              </button>
            </div>
          </div>
        )}

        {/* 빈 상태 안내 메시지 */}
        {!caseError && allMessages.length === 0 && !aiTyping && (
          <div className="flex gap-2 items-start animation-fade-up">
            <Avatar />
            <div className="cl-card rounded-tl-sm px-4 py-3.5 max-w-[82%]">
              <p className="text-ink text-base leading-relaxed">
                안녕하세요. 어떤 일로 마음이 무거우신가요?<br />편하게 말씀해 주시면 차근차근 함께 살펴볼게요.
              </p>
              <p className="text-ink-mute text-xs mt-2.5 pt-2.5 border-t border-line">
                안내드리는 내용은 일반 정보이며, 법률 자문은 변호사 상담으로 확인해 주세요.
              </p>
            </div>
          </div>
        )}

        {/* 메시지 목록 */}
        {allMessages.map((msg) => {
          const isUser = msg.role === 'user';
          const isTemp = msg.id.startsWith(TEMP_PREFIX);
          return (
            <div key={msg.id} className={`flex gap-2 items-end ${isUser ? 'flex-row-reverse' : ''}`}>
              {!isUser && <Avatar />}
              <div className="flex flex-col gap-1" style={{ maxWidth: '82%' }}>
                <div className={`px-4 py-3 text-base leading-relaxed whitespace-pre-wrap rounded-lg ${
                  isUser
                    ? 'text-white rounded-br-sm shadow-card'
                    : 'cl-card text-ink rounded-tl-sm'
                } ${isTemp ? 'opacity-70' : ''}`}
                  style={isUser ? { background: brandColor } : undefined}
                >
                  {msg.content.startsWith('📎') && msg.content.includes('[첨부파일:') ? (
                    <span className="flex items-center gap-2">
                      <FaPaperclip className="text-xs opacity-70" aria-hidden />
                      <span>{msg.content.replace(/^📎\s*/, '')}</span>
                    </span>
                  ) : msg.content}
                </div>
                <span className={`text-2xs text-ink-mute cl-num ${isUser ? 'text-right' : 'text-left'}`}>
                  {formatTime(msg.created_at)}
                </span>
              </div>
            </div>
          );
        })}

        {/* AI 타이핑 인디케이터 */}
        {aiTyping && (
          <div className="flex gap-2 items-end">
            <Avatar />
            <div className="cl-card rounded-tl-sm px-4 py-3.5">
              <div className="flex gap-1.5 items-center h-3" aria-label="입력 중">
                {[0, 1, 2].map(i => (
                  <span key={i} className="w-2 h-2 rounded-full bg-ink-mute animation-dot-bounce"
                       style={{ animationDelay: `${i * 0.16}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── 첨부 메뉴 ── */}
      {showAttach && (
        <div className="bg-paper-raised border-t border-line px-4 py-3 flex gap-3 animation-fade-up">
          <button onClick={() => { setShowAttach(false); cameraRef.current?.click(); }}
                  className="flex-1 flex flex-col items-center gap-1.5 py-3 bg-paper-sunken rounded-lg border border-line">
            <FaCamera className="text-lg" style={{ color: brandColor }} aria-hidden />
            <span className="text-xs text-ink-soft font-medium">카메라</span>
          </button>
          <button onClick={() => { setShowAttach(false); fileRef.current?.click(); }}
                  className="flex-1 flex flex-col items-center gap-1.5 py-3 bg-paper-sunken rounded-lg border border-line">
            <FaPaperclip className="text-lg" style={{ color: brandColor }} aria-hidden />
            <span className="text-xs text-ink-soft font-medium">파일·사진</span>
          </button>
        </div>
      )}

      {/* ── 입력 영역 ── */}
      <div className="bg-paper-raised border-t border-line px-4 pt-3 safe-bottom">
        {sendError && (
          <p className="text-danger text-sm text-center mb-2" role="alert">{sendError}</p>
        )}
        <div className="flex gap-2 items-end">
          <button onClick={() => setShowAttach(!showAttach)}
                  aria-label="첨부하기"
                  className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 bg-paper-sunken text-ink-soft hover:bg-line transition-colors">
            <FaPaperclip className="text-sm" />
          </button>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="편하게 말씀해 주세요…"
            rows={1}
            aria-label="메시지 입력"
            className="cl-input flex-1 max-h-32 !min-h-[2.75rem] py-3 rounded-xl"
          />
          <button onClick={sendMessage} disabled={!input.trim()}
                  aria-label="보내기"
                  className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-40 transition-opacity"
                  style={{ background: brandColor }}>
            <FaPaperPlane className="text-gold text-sm" aria-hidden />
          </button>
        </div>
        <input ref={fileRef} type="file" accept="image/*,.pdf" onChange={handleFileChange} className="hidden" />
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />
      </div>
    </div>
  );
}
