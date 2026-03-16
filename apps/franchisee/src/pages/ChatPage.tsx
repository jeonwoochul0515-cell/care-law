import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { functions, supabase, CASE_TYPE_LABELS } from '@care-law/shared';
import type { CaseType, Message } from '@care-law/shared';
import { useBrandStore } from '../store/brandStore';
import { useAuthStore }  from '../store/authStore';
import { FaArrowLeft, FaPaperPlane, FaCalendarAlt } from 'react-icons/fa';

const chatWithAI  = httpsCallable(functions, 'chatWithAI');
const classifyCase = httpsCallable(functions, 'classifyCase');

export default function ChatPage() {
  const { caseId: paramCaseId }    = useParams<{ caseId?: string }>();
  const [searchParams]              = useSearchParams();
  const navigate                    = useNavigate();
  const { brand }                   = useBrandStore();
  const { user, claims }            = useAuthStore();
  const [messages, setMessages]     = useState<Message[]>([]);
  const [input, setInput]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [sendError, setSendError]   = useState('');
  const [caseError, setCaseError]   = useState('');
  const [caseId, setCaseId]         = useState(paramCaseId ?? '');
  const caseType = (searchParams.get('type') as CaseType) ?? 'other';
  const bottomRef = useRef<HTMLDivElement>(null);

  // 케이스 없으면 Supabase에서 생성
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
  }, [user, claims, caseId]);

  // Supabase Realtime 구독
  useEffect(() => {
    if (!caseId) return;

    // 초기 메시지 로드
    supabase.from('carelaw_messages')
      .select('*')
      .eq('case_id', caseId)
      .order('created_at', { ascending: true })
      .then(({ data }) => setMessages(data ?? []));

    // 실시간 구독
    const channel = supabase
      .channel(`messages:${caseId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'carelaw_messages',
        filter: `case_id=eq.${caseId}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as Message]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [caseId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading || !caseId) return;
    const savedInput = input;
    setInput('');
    setSendError('');
    setLoading(true);
    try {
      // 첫 메시지면 케이스 분류
      if (messages.length === 0) {
        classifyCase({ caseId, firstMessage: text }).catch(() => {});
      }
      await chatWithAI({ caseId, message: text });
    } catch (err) {
      console.error(err);
      setInput(savedInput);
      setSendError('메시지 전송에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const brandColor = brand?.primary_color ?? '#1E2D4E';

  return (
    <div className="flex flex-col h-screen bg-gray-50">
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
        {!caseError && messages.length === 0 && !loading && (
          <div className="flex gap-2 items-start">
            <div className="w-8 h-8 rounded-full bg-[#C9A84C] flex items-center justify-center text-xs font-bold text-[#1E2D4E] flex-shrink-0">C</div>
            <div className="bg-white rounded-2xl rounded-tl-none px-4 py-3 max-w-[80%] shadow-sm border border-gray-100">
              <p className="text-gray-800 text-sm leading-relaxed">안녕하세요! 법률 문제를 편하게 말씀해 주세요.<br />어떤 어려움이 있으신가요?</p>
              <p className="text-gray-400 text-xs mt-2">※ 이 답변은 법률 자문이 아닌 일반 정보입니다</p>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-2 items-start ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-[#C9A84C] flex items-center justify-center text-xs font-bold text-[#1E2D4E] flex-shrink-0">C</div>
            )}
            <div className={`rounded-2xl px-4 py-3 max-w-[80%] shadow-sm text-sm leading-relaxed whitespace-pre-wrap ${
              msg.role === 'user'
                ? 'text-white rounded-tr-none'
                : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'
            }`} style={msg.role === 'user' ? { background: brandColor } : undefined}>
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-2 items-start">
            <div className="w-8 h-8 rounded-full bg-[#C9A84C] flex items-center justify-center text-xs font-bold text-[#1E2D4E] flex-shrink-0">C</div>
            <div className="bg-white rounded-2xl rounded-tl-none px-4 py-3 border border-gray-100 shadow-sm">
              <div className="flex gap-1 items-center h-4">
                {[0,1,2].map(i => (
                  <div key={i} className="w-2 h-2 rounded-full bg-gray-300 animate-bounce"
                       style={{ animationDelay: `${i*0.15}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="bg-white border-t border-gray-100 px-4 py-3">
        {sendError && (
          <p className="text-red-500 text-xs text-center mb-2">{sendError}</p>
        )}
        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="법률 문제를 입력하세요..."
            rows={1}
            className="flex-1 resize-none bg-gray-50 rounded-2xl px-4 py-3 text-sm outline-none border border-gray-200 max-h-32"
          />
          <button onClick={sendMessage} disabled={!input.trim() || loading}
                  className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-40"
                  style={{ background: brandColor }}>
            <FaPaperPlane className="text-[#C9A84C] text-sm" />
          </button>
        </div>
      </div>
    </div>
  );
}
