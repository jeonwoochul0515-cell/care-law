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

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-4 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-lg">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">구독 관리</h1>
        <p className="text-gray-500 text-sm mt-0.5">현재 플랜 및 사용 현황</p>
      </div>

      {/* 현재 플랜 */}
      <div className="bg-[#1E2D4E] rounded-2xl p-5 text-white">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-[#C9A84C] text-xs font-bold tracking-wider mb-1">현재 플랜</p>
            <p className="text-2xl font-bold">{PLAN_LABELS[currentPlan]}</p>
          </div>
          <div className="text-right">
            <p className="text-[#C9A84C] text-xl font-bold">
              {limit.price === 0 ? '무료' : `월 ${limit.price.toLocaleString()}원`}
            </p>
          </div>
        </div>
        <div className="bg-white/10 rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/70 text-xs">점주 사용량</span>
            <span className="text-white text-xs font-bold">{count} / {limit.maxFranchisees === 999 ? '무제한' : limit.maxFranchisees}명</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
            <div className="h-full bg-[#C9A84C] rounded-full transition-all"
                 style={{ width: `${limit.maxFranchisees === 999 ? 10 : Math.min((count / limit.maxFranchisees) * 100, 100)}%` }} />
          </div>
        </div>
      </div>

      {/* 플랜 비교 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
          <p className="font-semibold text-gray-700 text-sm">플랜 비교</p>
        </div>
        {(Object.keys(PLAN_LIMITS) as Plan[]).map((plan) => {
          const info = PLAN_LIMITS[plan];
          const isCurrent = plan === currentPlan;
          return (
            <div key={plan} className={`px-5 py-3.5 border-b border-gray-50 last:border-0 flex items-center justify-between ${isCurrent ? 'bg-blue-50/50' : ''}`}>
              <div className="flex items-center gap-3">
                <span className={`text-sm font-bold ${isCurrent ? 'text-[#1E2D4E]' : 'text-gray-700'}`}>
                  {PLAN_LABELS[plan]}
                </span>
                {isCurrent && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[#1E2D4E] text-[#C9A84C] font-bold">현재</span>
                )}
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-700 font-medium">
                  {info.price === 0 ? '무료' : `${info.price.toLocaleString()}원/월`}
                </p>
                <p className="text-xs text-gray-400">
                  최대 {info.maxFranchisees === 999 ? '무제한' : `${info.maxFranchisees}명`}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* 구독 상세 */}
      {sub && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          <p className="font-semibold text-gray-700 text-sm">구독 상세</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">상태</span>
              <span className={`font-medium ${sub.status === 'active' ? 'text-green-600' : 'text-gray-500'}`}>
                {sub.status === 'active' ? '활성' : sub.status === 'past_due' ? '연체' : sub.status}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">결제 금액</span>
              <span className="text-gray-800 font-medium">{sub.amount?.toLocaleString() ?? '-'}원</span>
            </div>
            {sub.next_billing && (
              <div className="flex justify-between">
                <span className="text-gray-500">다음 결제일</span>
                <span className="text-gray-800">{new Date(sub.next_billing).toLocaleDateString('ko-KR')}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 문의 */}
      <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-2">
        <p className="font-semibold text-gray-700 text-sm">플랜 변경 또는 문의</p>
        <p className="text-gray-500 text-xs leading-relaxed">
          플랜 변경이나 결제 관련 문의는 법률사무소 청송으로 연락해주세요.<br />
          현재 수동 청구 방식으로 운영됩니다.
        </p>
        <a href="mailto:lawchungsong@daum.net"
           className="block text-center bg-[#1E2D4E] text-[#C9A84C] font-bold py-3 rounded-xl text-sm mt-2">
          lawchungsong@daum.net 문의하기
        </a>
      </div>

      {sub?.memo && (
        <div className="bg-yellow-50 border border-yellow-100 rounded-xl px-4 py-3">
          <p className="text-yellow-800 text-xs font-bold mb-1">청구 메모</p>
          <p className="text-yellow-700 text-xs">{sub.memo}</p>
        </div>
      )}
    </div>
  );
}
