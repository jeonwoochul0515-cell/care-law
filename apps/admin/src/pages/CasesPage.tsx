// 전체 케이스 — 시스템 전역 법률 상담 목록 + 상태 필터
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, CASE_TYPE_LABELS, CASE_STATUS_LABELS } from '@care-law/shared';
import type { Case } from '@care-law/shared';
import { ErrorBox } from './DashboardPage';

const STATUS_BADGE: Record<string, string> = {
  open: 'cl-badge-success',
  consulting: 'cl-badge-warn',
  retained: 'cl-badge-brand',
  closed: 'cl-badge-neutral',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`cl-badge ${STATUS_BADGE[status] ?? 'cl-badge-neutral'}`}>
      {CASE_STATUS_LABELS[status as keyof typeof CASE_STATUS_LABELS] ?? status}
    </span>
  );
}

const FILTERS: [string, string][] = [
  ['all', '전체'], ['open', '상담중'], ['consulting', '검토중'], ['retained', '수임'], ['closed', '종결'],
];

export default function CasesPage() {
  const navigate = useNavigate();
  const [cases, setCases]     = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);
  const [filter, setFilter]   = useState('all');

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const { data, error } = await supabase.from('carelaw_cases').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setCases((data as Case[]) ?? []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = filter === 'all' ? cases : cases.filter(c => c.status === filter);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-5 md:p-8">
      <header>
        <p className="cl-eyebrow cl-eyebrow-gold">운영 콘솔</p>
        <h1 className="cl-display mt-1 text-2xl md:text-3xl">전체 케이스</h1>
        <hr className="cl-rule-gold mt-3 w-12" />
        <p className="mt-2 text-sm text-ink-soft">시스템 전체 상담 {cases.length}건</p>
      </header>

      {/* 필터 */}
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="상태 필터">
        {FILTERS.map(([val, label]) => (
          <button
            key={val}
            role="tab"
            aria-selected={filter === val}
            onClick={() => setFilter(val)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              filter === val
                ? 'bg-ink text-paper'
                : 'border border-line-strong bg-paper-raised text-ink-soft hover:bg-paper-sunken'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error ? (
        <ErrorBox onRetry={load} />
      ) : (
        <section className="cl-card overflow-hidden">
          {loading ? (
            <div className="space-y-3 p-5">
              {[0, 1, 2, 3].map((i) => <div key={i} className="cl-skeleton h-10 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="font-semibold text-ink">표시할 케이스가 없어요</p>
              <p className="mt-1 text-sm text-ink-soft">
                {filter === 'all' ? '아직 접수된 상담이 없어요.' : '이 상태의 케이스가 없어요. 다른 필터를 확인해 보세요.'}
              </p>
            </div>
          ) : (
            <>
              <table className="hidden w-full md:table">
                <thead>
                  <tr className="border-b border-line text-left text-2xs uppercase tracking-wide text-ink-mute">
                    <th className="px-5 py-3 font-semibold">제목</th>
                    <th className="px-5 py-3 font-semibold">유형</th>
                    <th className="px-5 py-3 font-semibold">상태</th>
                    <th className="px-5 py-3 font-semibold">생성일</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filtered.map((c) => (
                    <tr key={c.id} onClick={() => navigate(`/cases/${c.id}`)}
                        className="cursor-pointer transition-colors hover:bg-paper-sunken">
                      <td className="px-5 py-3.5 font-medium text-ink">{c.title}</td>
                      <td className="px-5 py-3.5 text-ink-soft">{CASE_TYPE_LABELS[c.type]}</td>
                      <td className="px-5 py-3.5"><StatusBadge status={c.status} /></td>
                      <td className="cl-num px-5 py-3.5 text-xs text-ink-mute">{new Date(c.created_at).toLocaleDateString('ko-KR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <ul className="divide-y divide-line md:hidden">
                {filtered.map((c) => (
                  <li key={c.id}>
                    <button onClick={() => navigate(`/cases/${c.id}`)}
                            className="block w-full px-5 py-4 text-left transition-colors hover:bg-paper-sunken">
                      <div className="flex items-center justify-between gap-3">
                        <p className="min-w-0 truncate font-medium text-ink">{c.title}</p>
                        <StatusBadge status={c.status} />
                      </div>
                      <div className="mt-1.5 flex items-center justify-between gap-3 text-xs text-ink-mute">
                        <span>{CASE_TYPE_LABELS[c.type]}</span>
                        <span className="cl-num">{new Date(c.created_at).toLocaleDateString('ko-KR')}</span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}
    </div>
  );
}
