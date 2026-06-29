// 구독 관리 — 현재 플랜·사용량·플랜 비교·수동 청구 안내
import { useEffect, useState } from 'react';
import { supabase, PLAN_LABELS, PLAN_LIMITS } from '@care-law/shared';
import type { Plan } from '@care-law/shared';
import { useAuthStore } from '../store/authStore';

export default function SubscriptionPage() {
  const { claims, brand } = useAuthStore();
  const brandId           = claims?.brand_id ?? '';
  const [sub, setSub]     = useState<any>(null);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const currentPlan       = (brand?.plan ?? 'free') as Plan;

  useEffect(() => {
    if (!brandId) return;
    Promise.all([
      supabase.from('carelaw_subscriptions').select('*').eq('brand_id', brandId).single(),
      supabase.from('carelaw_franchisees').select('*', { count: 'exact', head: true }).eq('brand_id', brandId).eq('active', true),
    ]).then(([s, f]) => {
      setSub(s.data);
      setCount(f.count ?? 0);
      setLoading(false);
    });
  }, [brandId]);

  const limit = PLAN_LIMITS[currentPlan];
  const isUnlimited = limit.maxFranchisees === 999;
  const usagePct = isUnlimited ? 10 : Math.min((count / limit.maxFranchisees) * 100, 100);

  const subStatusLabel = sub?.status === 'active' ? '활성'
    : sub?.status === 'past_due' ? '연체' : sub?.status;
  const subStatusBadge = sub?.status === 'active' ? 'cl-badge-success'
    : sub?.status === 'past_due' ? 'cl-badge-warn' : 'cl-badge-neutral';

  return (
    <div className="p-5 sm:p-8 max-w-lg mx-auto">
      <header className="mb-7">
        <p className="cl-eyebrow mb-1.5">운영 콘솔</p>
        <h1 className="cl-display text-2xl sm:text-3xl">구독 관리</h1>
        <hr className="cl-rule-gold w-16 mt-3" />
        <p className="text-ink-soft text-sm mt-3">현재 플랜과 점주 사용량을 확인하세요.</p>
      </header>

      {loading ? (
        <div className="space-y-4">
          <span className="cl-skeleton block h-36 rounded-xl" />
          <span className="cl-skeleton block h-56 rounded-lg" />
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-5">
          {/* 현재 플랜 */}
          <div className="bg-ink rounded-xl p-5 sm:p-6">
            <div className="flex items-start justify-between mb-5">
              <div>
                <p className="cl-eyebrow cl-eyebrow-gold mb-1.5">현재 플랜</p>
                <p className="cl-display text-paper text-2xl">{PLAN_LABELS[currentPlan]}</p>
              </div>
              <p className="cl-num text-gold text-lg font-semibold text-right">
                {limit.price === 0 ? '무료' : <>월 {limit.price.toLocaleString()}원</>}
              </p>
            </div>
            <div className="bg-white/10 rounded-lg p-3.5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-paper/60 text-xs">점주 사용량</span>
                <span className="cl-num text-paper text-xs font-semibold">{count} / {isUnlimited ? '무제한' : `${limit.maxFranchisees}명`}</span>
              </div>
              <div className="w-full bg-white/15 rounded-full h-2 overflow-hidden" role="progressbar" aria-valuenow={count} aria-valuemax={isUnlimited ? undefined : limit.maxFranchisees}>
                <div className="h-full bg-gold rounded-full transition-all" style={{ width: `${usagePct}%` }} />
              </div>
            </div>
          </div>

          {/* 플랜 비교 */}
          <section className="cl-card overflow-hidden">
            <div className="px-5 py-3 border-b border-line bg-paper-sunken">
              <p className="font-semibold text-ink-soft text-sm">플랜 비교</p>
            </div>
            <ul className="divide-y divide-line">
              {(Object.keys(PLAN_LIMITS) as Plan[]).map((plan) => {
                const info = PLAN_LIMITS[plan];
                const isCurrent = plan === currentPlan;
                return (
                  <li key={plan} className={`px-5 py-3.5 flex items-center justify-between ${isCurrent ? 'bg-gold-soft/40' : ''}`}>
                    <div className="flex items-center gap-2.5">
                      <span className={`text-sm font-semibold ${isCurrent ? 'text-ink' : 'text-ink-soft'}`}>{PLAN_LABELS[plan]}</span>
                      {isCurrent && <span className="cl-badge cl-badge-gold">현재</span>}
                    </div>
                    <div className="text-right">
                      <p className="cl-num text-sm text-ink font-medium">{info.price === 0 ? '무료' : `${info.price.toLocaleString()}원/월`}</p>
                      <p className="text-ink-mute text-xs">최대 {info.maxFranchisees === 999 ? '무제한' : `${info.maxFranchisees}명`}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* 구독 상세 */}
          {sub && (
            <section className="cl-card p-5 space-y-3">
              <p className="font-semibold text-ink-soft text-sm">구독 상세</p>
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-ink-soft">상태</span>
                  <span className={`cl-badge ${subStatusBadge}`}>{subStatusLabel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-soft">결제 금액</span>
                  <span className="cl-num text-ink font-medium">{sub.amount?.toLocaleString() ?? '-'}원</span>
                </div>
                {sub.next_billing && (
                  <div className="flex justify-between">
                    <span className="text-ink-soft">다음 결제일</span>
                    <span className="cl-num text-ink">{new Date(sub.next_billing).toLocaleDateString('ko-KR')}</span>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* 청구 메모 */}
          {sub?.memo && (
            <div className="bg-warn-soft border border-line rounded-lg px-4 py-3">
              <p className="text-warn text-xs font-semibold mb-1">청구 메모</p>
              <p className="text-ink-soft text-xs">{sub.memo}</p>
            </div>
          )}

          {/* 문의 */}
          <section className="cl-card-sunken p-5 space-y-2">
            <p className="font-semibold text-ink text-sm">플랜 변경이 필요하신가요?</p>
            <p className="text-ink-soft text-sm leading-relaxed">
              현재는 법률사무소 청송이 직접 청구를 도와드리고 있어요. 플랜 변경이나 결제 문의는 아래로 편하게 연락 주세요.
            </p>
            <a href="mailto:lawchungsong@daum.net" className="cl-btn cl-btn-primary cl-btn-block mt-1">
              lawchungsong@daum.net 으로 문의하기
            </a>
          </section>
        </div>
      )}
    </div>
  );
}
