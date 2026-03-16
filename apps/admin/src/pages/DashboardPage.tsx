import { useEffect, useState } from 'react';
import { supabase, PLAN_LABELS } from '@care-law/shared';
import type { Brand } from '@care-law/shared';

export default function DashboardPage() {
  const [brands, setBrands]             = useState<Brand[]>([]);
  const [franchiseeCount, setFCount]    = useState(0);
  const [caseCount, setCCount]          = useState(0);
  const [openCaseCount, setOCCount]     = useState(0);
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from('carelaw_brands').select('*').order('created_at', { ascending: false }),
      supabase.from('carelaw_franchisees').select('*', { count: 'exact', head: true }),
      supabase.from('carelaw_cases').select('*', { count: 'exact', head: true }),
      supabase.from('carelaw_cases').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    ]).then(([b, f, c, oc]) => {
      setBrands(b.data as Brand[] ?? []);
      setFCount(f.count ?? 0);
      setCCount(c.count ?? 0);
      setOCCount(oc.count ?? 0);
      setLoading(false);
    });
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
        <p className="text-gray-500 text-sm mt-0.5">케어로 시스템 전체 현황</p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: '총 브랜드', value: brands.length, color: 'bg-blue-50 text-blue-700' },
          { label: '총 점주', value: franchiseeCount, color: 'bg-green-50 text-green-700' },
          { label: '전체 케이스', value: caseCount, color: 'bg-purple-50 text-purple-700' },
          { label: '상담 중', value: openCaseCount, color: 'bg-yellow-50 text-yellow-700' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-5">
            <p className="text-gray-500 text-xs mb-1">{s.label}</p>
            <p className="text-3xl font-bold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* 최근 브랜드 */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h2 className="font-bold text-gray-900">최근 등록 브랜드</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {['브랜드명', '서브도메인', '플랜', '상태'].map(h => (
                <th key={h} className="px-5 py-3 text-left text-xs text-gray-500 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {brands.slice(0, 10).map(b => (
              <tr key={b.id} className="border-t border-gray-50">
                <td className="px-5 py-3 font-medium text-gray-900">{b.name}</td>
                <td className="px-5 py-3 text-gray-500">{b.subdomain}.care-law.kr</td>
                <td className="px-5 py-3">
                  <span className="text-xs px-2 py-1 rounded-full bg-[#1E2D4E] text-[#C9A84C]">
                    {PLAN_LABELS[b.plan]}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${b.active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                    {b.active ? '활성' : '비활성'}
                  </span>
                </td>
              </tr>
            ))}
            {brands.length === 0 && (
              <tr><td colSpan={4} className="text-center py-10 text-gray-400">등록된 브랜드가 없습니다</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
