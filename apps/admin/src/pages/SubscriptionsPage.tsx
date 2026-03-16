import { useEffect, useState } from 'react';
import { supabase, PLAN_LABELS, PLAN_LIMITS } from '@care-law/shared';
import type { Brand } from '@care-law/shared';

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

export default function SubscriptionsPage() {
  const [subs, setSubs]       = useState<SubRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from('carelaw_subscriptions').select('*').order('created_at', { ascending: false }),
      supabase.from('carelaw_brands').select('*'),
    ]).then(([s, b]) => {
      const brands = (b.data ?? []) as Brand[];
      const brandMap = new Map(brands.map(br => [br.id, br]));
      const enriched = (s.data ?? []).map((sub: any) => ({
        ...sub,
        brand: brandMap.get(sub.brand_id),
      }));
      setSubs(enriched);
      setLoading(false);
    });
  }, []);

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">구독 관리</h1>
        <p className="text-gray-500 text-sm mt-0.5">브랜드별 구독 현황</p>
      </div>

      {/* 플랜 요약 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {(['free', 'starter', 'growth', 'enterprise'] as const).map(plan => {
          const count = subs.filter(s => s.plan === plan).length;
          return (
            <div key={plan} className="bg-white rounded-2xl border border-gray-100 p-4">
              <p className="text-xs text-gray-500 mb-1">{PLAN_LABELS[plan]}</p>
              <p className="text-2xl font-bold text-gray-900">{count}</p>
              <p className="text-xs text-gray-400">
                {PLAN_LIMITS[plan].price === 0 ? '무료' : `월 ${PLAN_LIMITS[plan].price.toLocaleString()}원`}
              </p>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {['브랜드', '플랜', '금액', '상태', '다음 청구', '메모'].map(h => (
                <th key={h} className="px-5 py-3 text-left text-xs text-gray-500 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-10 text-gray-400">로딩 중...</td></tr>
            ) : subs.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-10 text-gray-400">구독 내역이 없습니다</td></tr>
            ) : subs.map(s => (
              <tr key={s.id} className="border-t border-gray-50">
                <td className="px-5 py-3 font-medium text-gray-900">{s.brand?.name ?? s.brand_id}</td>
                <td className="px-5 py-3">
                  <span className="text-xs px-2 py-1 rounded-full bg-[#1E2D4E] text-[#C9A84C]">
                    {PLAN_LABELS[s.plan as keyof typeof PLAN_LABELS] ?? s.plan}
                  </span>
                </td>
                <td className="px-5 py-3 text-gray-600">{s.amount.toLocaleString()}원</td>
                <td className="px-5 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    s.status === 'active' ? 'bg-green-50 text-green-700' :
                    s.status === 'past_due' ? 'bg-yellow-50 text-yellow-700' :
                    'bg-red-50 text-red-600'
                  }`}>{s.status}</span>
                </td>
                <td className="px-5 py-3 text-gray-400 text-xs">
                  {s.next_billing ? new Date(s.next_billing).toLocaleDateString('ko-KR') : '-'}
                </td>
                <td className="px-5 py-3 text-gray-500 text-xs truncate max-w-[200px]">{s.memo ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
