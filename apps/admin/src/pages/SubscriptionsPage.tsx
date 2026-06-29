// 구독 관리 — 플랜별 요약 + 브랜드별 구독 현황
import { useEffect, useState } from 'react';
import { supabase, PLAN_LABELS, PLAN_LIMITS } from '@care-law/shared';
import type { Brand } from '@care-law/shared';
import { ErrorBox } from './DashboardPage';

interface SubRow {
  id: string;
  brand_id: string;
  plan: string;
  amount: number;
  status: string;
  next_billing: string | null;
  memo: string | null;
  brand?: Brand;
}

const STATUS_META: Record<string, { badge: string; label: string }> = {
  active:   { badge: 'cl-badge-success', label: '정상' },
  past_due: { badge: 'cl-badge-warn',    label: '연체' },
  cancelled:{ badge: 'cl-badge-neutral', label: '해지' },
};

function SubStatus({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? { badge: 'cl-badge-danger', label: status };
  return <span className={`cl-badge ${meta.badge}`}>{meta.label}</span>;
}

export default function SubscriptionsPage() {
  const [subs, setSubs]       = useState<SubRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const [s, b] = await Promise.all([
        supabase.from('carelaw_subscriptions').select('*').order('created_at', { ascending: false }),
        supabase.from('carelaw_brands').select('*'),
      ]);
      if (s.error) throw s.error;
      if (b.error) throw b.error;
      const brands = (b.data ?? []) as Brand[];
      const brandMap = new Map(brands.map(br => [br.id, br]));
      const enriched = (s.data ?? []).map((sub: any) => ({ ...sub, brand: brandMap.get(sub.brand_id) }));
      setSubs(enriched);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-5 md:p-8">
      <header>
        <p className="cl-eyebrow cl-eyebrow-gold">운영 콘솔</p>
        <h1 className="cl-display mt-1 text-2xl md:text-3xl">구독 관리</h1>
        <hr className="cl-rule-gold mt-3 w-12" />
        <p className="mt-2 text-sm text-ink-soft">브랜드별 구독 현황</p>
      </header>

      {/* 플랜 요약 */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {(['free', 'starter', 'growth', 'enterprise'] as const).map((plan) => {
          const count = subs.filter(s => s.plan === plan).length;
          const price = PLAN_LIMITS[plan].price;
          return (
            <div key={plan} className="cl-card p-4">
              <p className="text-xs text-ink-mute">{PLAN_LABELS[plan]}</p>
              <p className="cl-num mt-1.5 text-2xl font-semibold text-ink">{loading ? '–' : count}</p>
              <p className="mt-0.5 text-xs text-ink-mute">{price === 0 ? '무료' : `월 ${price.toLocaleString()}원`}</p>
            </div>
          );
        })}
      </div>

      {error ? (
        <ErrorBox onRetry={load} />
      ) : (
        <section className="cl-card overflow-hidden">
          {loading ? (
            <div className="space-y-3 p-5">
              {[0, 1, 2].map((i) => <div key={i} className="cl-skeleton h-10 w-full" />)}
            </div>
          ) : subs.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="font-semibold text-ink">아직 구독 내역이 없어요</p>
              <p className="mt-1 text-sm text-ink-soft">브랜드가 플랜에 가입하면 여기에 표시돼요.</p>
            </div>
          ) : (
            <>
              <table className="hidden w-full md:table">
                <thead>
                  <tr className="border-b border-line text-left text-2xs uppercase tracking-wide text-ink-mute">
                    <th className="px-5 py-3 font-semibold">브랜드</th>
                    <th className="px-5 py-3 font-semibold">플랜</th>
                    <th className="px-5 py-3 text-right font-semibold">금액</th>
                    <th className="px-5 py-3 font-semibold">상태</th>
                    <th className="px-5 py-3 font-semibold">다음 청구</th>
                    <th className="px-5 py-3 font-semibold">메모</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {subs.map((s) => (
                    <tr key={s.id} className="transition-colors hover:bg-paper-sunken">
                      <td className="px-5 py-3.5 font-medium text-ink">{s.brand?.name ?? s.brand_id}</td>
                      <td className="px-5 py-3.5"><span className="cl-badge cl-badge-gold">{PLAN_LABELS[s.plan as keyof typeof PLAN_LABELS] ?? s.plan}</span></td>
                      <td className="cl-num px-5 py-3.5 text-right text-ink-soft">{s.amount.toLocaleString()}원</td>
                      <td className="px-5 py-3.5"><SubStatus status={s.status} /></td>
                      <td className="cl-num px-5 py-3.5 text-xs text-ink-mute">{s.next_billing ? new Date(s.next_billing).toLocaleDateString('ko-KR') : '-'}</td>
                      <td className="max-w-[200px] truncate px-5 py-3.5 text-xs text-ink-soft">{s.memo ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <ul className="divide-y divide-line md:hidden">
                {subs.map((s) => (
                  <li key={s.id} className="px-5 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="min-w-0 truncate font-medium text-ink">{s.brand?.name ?? s.brand_id}</p>
                      <SubStatus status={s.status} />
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <span className="cl-badge cl-badge-gold">{PLAN_LABELS[s.plan as keyof typeof PLAN_LABELS] ?? s.plan}</span>
                      <span className="cl-num text-sm text-ink-soft">{s.amount.toLocaleString()}원</span>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between gap-3 text-xs text-ink-mute">
                      <span>다음 청구 <span className="cl-num">{s.next_billing ? new Date(s.next_billing).toLocaleDateString('ko-KR') : '-'}</span></span>
                    </div>
                    {s.memo && <p className="mt-1 truncate text-xs text-ink-soft">{s.memo}</p>}
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
