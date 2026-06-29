// 케이스 상세 — AI 사무장 보고서, 첨부파일, 사무장·의뢰인 대화 내역
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, CASE_TYPE_LABELS, CASE_STATUS_LABELS } from '@care-law/shared';
import type { Case, Message } from '@care-law/shared';
import { FaArrowLeft, FaUser, FaRobot, FaFileAlt, FaPaperclip, FaExternalLinkAlt, FaFilePdf, FaImage } from 'react-icons/fa';
import { ErrorBox } from './DashboardPage';

const STATUS_BADGE: Record<string, string> = {
  open: 'cl-badge-success',
  consulting: 'cl-badge-warn',
  retained: 'cl-badge-brand',
  closed: 'cl-badge-neutral',
};

export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(false);
  const [brandName, setBrandName] = useState('');

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setError(false);
    try {
      const [c, m] = await Promise.all([
        supabase.from('carelaw_cases').select('*').eq('id', id).single(),
        supabase.from('carelaw_messages').select('*').eq('case_id', id).order('created_at', { ascending: true }),
      ]);
      if (c.error) throw c.error;
      const cs = c.data as Case;
      setCaseData(cs);
      setMessages((m.data as Message[]) ?? []);
      if (cs?.brand_id) {
        const { data: brand } = await supabase.from('carelaw_brands').select('name').eq('id', cs.brand_id).single();
        setBrandName(brand?.name ?? '');
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const paperMessage = [...messages].reverse().find((m: Message) =>
    m.role === 'assistant' && m.content.includes('사건 요약 보고서')
  );

  const backLink = (
    <button onClick={() => navigate('/cases')} className="inline-flex items-center gap-2 text-sm text-ink-soft transition-colors hover:text-ink">
      <FaArrowLeft className="text-xs" aria-hidden /> 케이스 목록
    </button>
  );

  if (loading) return (
    <div className="mx-auto max-w-4xl space-y-6 p-5 md:p-8">
      <div className="cl-skeleton h-5 w-28" />
      <div className="cl-skeleton h-28 w-full rounded-lg" />
      <div className="cl-skeleton h-72 w-full rounded-lg" />
    </div>
  );

  if (error) return (
    <div className="mx-auto max-w-4xl space-y-6 p-5 md:p-8">
      {backLink}
      <ErrorBox onRetry={load} />
    </div>
  );

  if (!caseData) return (
    <div className="mx-auto max-w-4xl space-y-6 p-5 md:p-8">
      {backLink}
      <div className="cl-card p-10 text-center">
        <p className="font-semibold text-ink">케이스를 찾을 수 없어요</p>
        <p className="mt-1 text-sm text-ink-soft">삭제되었거나 잘못된 주소일 수 있어요.</p>
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-5 md:p-8">
      {backLink}

      {/* 케이스 헤더 */}
      <section className="cl-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="cl-eyebrow cl-eyebrow-gold">케이스</p>
            <h1 className="cl-display mt-1 text-2xl">{caseData.title}</h1>
            <p className="mt-1.5 text-sm text-ink-soft">
              {brandName && <span className="font-medium text-gold">{brandName}</span>}
              {brandName && ' · '}
              {CASE_TYPE_LABELS[caseData.type]} · <span className="cl-num">{new Date(caseData.created_at).toLocaleDateString('ko-KR')}</span>
            </p>
          </div>
          <span className={`cl-badge ${STATUS_BADGE[caseData.status] ?? 'cl-badge-neutral'}`}>
            {CASE_STATUS_LABELS[caseData.status as keyof typeof CASE_STATUS_LABELS] ?? caseData.status}
          </span>
        </div>
      </section>

      {/* AI 사무장 보고서 */}
      {paperMessage && (
        <section className="cl-card-flat border-gold/30 bg-gold-soft/40 p-6">
          <div className="mb-4 flex items-center gap-2">
            <FaFileAlt className="text-gold" aria-hidden />
            <h2 className="font-semibold text-ink">AI 사무장 보고서</h2>
          </div>
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-ink">{paperMessage.content}</div>
        </section>
      )}

      {/* 첨부파일 */}
      {caseData.attachments && caseData.attachments.length > 0 && (
        <section className="cl-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <FaPaperclip className="text-ink-mute" aria-hidden />
            <h2 className="font-semibold text-ink">첨부파일 <span className="cl-num text-ink-mute">{caseData.attachments.length}</span>건</h2>
          </div>
          <div className="space-y-2">
            {caseData.attachments.map((url, i) => {
              const name = decodeURIComponent(url.split('/').pop() ?? `파일 ${i + 1}`);
              const isPdf = url.toLowerCase().endsWith('.pdf');
              const isImg = /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(url);
              return (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                   className="flex items-center gap-3 rounded-md bg-paper-sunken p-3 transition-colors hover:bg-line">
                  {isPdf ? <FaFilePdf className="flex-shrink-0 text-lg text-danger" aria-hidden />
                    : isImg ? <FaImage className="flex-shrink-0 text-lg text-ink-soft" aria-hidden />
                    : <FaFileAlt className="flex-shrink-0 text-lg text-ink-mute" aria-hidden />}
                  <span className="flex-1 truncate text-sm text-ink">{name}</span>
                  <FaExternalLinkAlt className="flex-shrink-0 text-xs text-ink-mute" aria-hidden />
                </a>
              );
            })}
          </div>
        </section>
      )}

      {/* 대화 내역 */}
      <section className="cl-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-semibold text-ink">대화 내역 <span className="cl-num text-ink-mute">{messages.length}</span>건</h2>
          <span className="text-xs text-ink-mute">사무장 ↔ 의뢰인</span>
        </div>
        <div className="max-h-[600px] overflow-y-auto">
          {messages.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-ink-soft">아직 대화 내역이 없어요.</p>
          ) : messages.map((msg) => (
            <div key={msg.id} className={`border-b border-line px-5 py-3.5 last:border-0 ${msg.role === 'assistant' ? 'bg-paper-sunken/50' : ''}`}>
              <div className="mb-1.5 flex items-center gap-2">
                {msg.role === 'user' ? (
                  <>
                    <FaUser className="text-xs text-ink-soft" aria-hidden />
                    <span className="text-xs font-semibold text-ink-soft">의뢰인</span>
                  </>
                ) : (
                  <>
                    <FaRobot className="text-xs text-gold" aria-hidden />
                    <span className="text-xs font-semibold text-gold">AI 사무장</span>
                  </>
                )}
                <span className="cl-num ml-auto text-2xs text-ink-mute">
                  {new Date(msg.created_at).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="whitespace-pre-wrap pl-5 text-sm leading-relaxed text-ink">
                {msg.content.startsWith('📎') && msg.content.includes('[첨부파일:') ? (
                  <div className="flex items-center gap-2 py-1">
                    <FaPaperclip className="text-xs text-ink-soft" aria-hidden />
                    <span className="font-medium text-ink-soft">{msg.content.split('\n')[0]}</span>
                    {msg.content.split('\n').slice(1).join('\n') && (
                      <span className="mt-1 block text-ink">{msg.content.split('\n').slice(1).join('\n')}</span>
                    )}
                  </div>
                ) : msg.content.length > 500 && !msg.content.includes('사건 요약 보고서')
                  ? msg.content.slice(0, 500) + '...'
                  : msg.content}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
