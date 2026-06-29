// 운영 대시보드 — 시스템 전체 현황 요약
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase, PLAN_LABELS } from '@care-law/shared';
import type { Brand } from '@care-law/shared';

export default function DashboardPage() {
  const [brands, setBrands]          = useState<Brand[]>([]);
  const [franchiseeCount, setFCount] = useState(0);
  const [caseCount, setCCount]       = useState(0);
  const [openCaseCount, setOCCount]  = useState(0);
  const [loading, setLoading]        = useState(true);
  const [error, setError]            = useState(false);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const [b, f, c, oc] = await Promise.all([
        supabase.from('carelaw_brands').select('*').order('created_at', { ascending: false }),
        supabase.from('carelaw_franchisees').select('*', { count: 'exact', head: true }),
        supabase.from('carelaw_cases').select('*', { count: 'exact', head: true }),
        supabase.from('carelaw_cases').select('*', { count: 'exact', head: true }).eq('status', 'open'),
      ]);
      if (b.error) throw b.error;
      setBrands((b.data as Brand[]) ?? []);
      setFCount(f.count ?? 0);
      setCCount(c.count ?? 0);
      setOCCount(oc.count ?? 0);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const stats = [
    { label: '총 브랜드',   value: brands.length },
    { label: '총 점주',     value: franchiseeCount },
    { label: '전체 케이스', value: caseCount },
    { label: '상담 중',     value: openCaseCount },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-7 p-5 md:p-8">
      <header>
        <p className="cl-eyebrow cl-eyebrow-gold">운영 콘솔</p>
        <h1 className="cl-display mt-1 text-2xl md:text-3xl">대시보드</h1>
        <hr className="cl-rule-gold mt-3 w-12" />
      </header>

      {error ? (
        <ErrorBox onRetry={load} />
      ) : (
        <>
          {/* 통계 카드 */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {loading
              ? stats.map((s) => (
                  <div key={s.label} className="cl-card p-5">
                    <div className="cl-skeleton mb-3 h-3 w-16" />
                    <div className="cl-skeleton h-8 w-12" />
                  </div>
                ))
              : stats.map((s) => (
                  <div key={s.label} className="cl-card p-5">
                    <p className="text-xs text-ink-mute">{s.label}</p>
                    <p className="cl-num mt-2 text-3xl font-semibold text-ink">{s.value}</p>
                  </div>
                ))}
          </div>

          {/* 최근 브랜드 */}
          <section className="cl-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="font-semibold text-ink">최근 등록 브랜드</h2>
              <Link to="/brands" className="cl-link text-sm">전체 보기</Link>
            </div>

            {loading ? (
              <div className="space-y-3 p-5">
                {[0, 1, 2].map((i) => <div key={i} className="cl-skeleton h-10 w-full" />)}
              </div>
            ) : brands.length === 0 ? (
              <EmptyBrands />
            ) : (
              <>
                {/* 데스크톱 테이블 */}
                <table className="hidden w-full md:table">
                  <thead>
                    <tr className="border-b border-line text-left text-2xs uppercase tracking-wide text-ink-mute">
                      <th className="px-5 py-3 font-semibold">브랜드명</th>
                      <th className="px-5 py-3 font-semibold">서브도메인</th>
                      <th className="px-5 py-3 font-semibold">플랜</th>
                      <th className="px-5 py-3 font-semibold">상태</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {brands.slice(0, 10).map((b) => (
                      <tr key={b.id} className="transition-colors hover:bg-paper-sunken">
                        <td className="px-5 py-3.5 font-medium text-ink">{b.name}</td>
                        <td className="px-5 py-3.5 text-ink-soft">{b.subdomain}.care-law.kr</td>
                        <td className="px-5 py-3.5"><span className="cl-badge cl-badge-gold">{PLAN_LABELS[b.plan]}</span></td>
                        <td className="px-5 py-3.5"><ActiveBadge active={b.active} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* 모바일 카드 */}
                <ul className="divide-y divide-line md:hidden">
                  {brands.slice(0, 10).map((b) => (
                    <li key={b.id} className="px-5 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-ink">{b.name}</p>
                        <ActiveBadge active={b.active} />
                      </div>
                      <div className="mt-1.5 flex items-center justify-between gap-3">
                        <p className="text-sm text-ink-soft">{b.subdomain}.care-law.kr</p>
                        <span className="cl-badge cl-badge-gold">{PLAN_LABELS[b.plan]}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function ActiveBadge({ active }: { active: boolean }) {
  return active ? (
    <span className="cl-badge cl-badge-success"><span className="cl-dot bg-success" />활성</span>
  ) : (
    <span className="cl-badge cl-badge-neutral"><span className="cl-dot bg-ink-mute" />비활성</span>
  );
}

function EmptyBrands() {
  return (
    <div className="px-5 py-12 text-center">
      <p className="font-semibold text-ink">아직 등록된 브랜드가 없어요</p>
      <p className="mt-1 text-sm text-ink-soft">브랜드 관리에서 첫 브랜드를 만들어 보세요.</p>
      <Link to="/brands" className="cl-btn cl-btn-secondary cl-btn-sm mt-4">브랜드 만들기</Link>
    </div>
  );
}

export function ErrorBox({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="cl-card p-10 text-center">
      <p className="font-semibold text-ink">정보를 불러오지 못했어요</p>
      <p className="mt-1 text-sm text-ink-soft">잠시 후 다시 시도해 주세요.</p>
      <button onClick={onRetry} className="cl-btn cl-btn-secondary cl-btn-sm mt-4">다시 시도</button>
    </div>
  );
}
