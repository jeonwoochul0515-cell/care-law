import { useEffect, useState } from 'react';
import { supabase, CASE_TYPE_LABELS, CASE_STATUS_LABELS } from '@care-law/shared';
import { useAuthStore } from '../store/authStore';
import { FaShieldAlt } from 'react-icons/fa';

export default function CasesPage() {
  const { claims }    = useAuthStore();
  const brandId       = claims?.brand_id ?? '';
  const [stats, setStats] = useState<{ type: string; status: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!brandId) return;
    supabase.from('carelaw_cases').select('type, status').eq('brand_id', brandId)
      .then(({ data }) => { setStats(data ?? []); setLoading(false); });
  }, [brandId]);

  const total = stats.length;
  const byStatus: Record<string, number> = {};
  const byType: Record<string, number> = {};
  stats.forEach(c => {
    byStatus[c.status] = (byStatus[c.status] ?? 0) + 1;
    byType[c.type] = (byType[c.type] ?? 0) + 1;
  });

  const STATUS_STYLE: Record<string,string> = {
    open: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    consulting: 'bg-blue-50 text-blue-700 border-blue-200',
    retained: 'bg-purple-50 text-purple-700 border-purple-200',
    closed: 'bg-gray-50 text-gray-500 border-gray-200',
  };

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">케이스 통계</h1>
        <p className="text-gray-500 text-sm mt-0.5">소속 점주 법률 상담 현황</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 border-4 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* 전체 건수 */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
            <p className="text-gray-500 text-sm">전체 상담 건수</p>
            <p className="text-4xl font-bold text-[#1E2D4E] mt-1">{total}건</p>
          </div>

          {/* 상태별 */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <h2 className="font-bold text-gray-900">상태별 현황</h2>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(CASE_STATUS_LABELS).map(([key, label]) => (
                <div key={key} className={`rounded-xl border p-4 ${STATUS_STYLE[key] ?? 'bg-gray-50 border-gray-200'}`}>
                  <p className="text-xs opacity-70">{label}</p>
                  <p className="text-2xl font-bold mt-1">{byStatus[key] ?? 0}건</p>
                </div>
              ))}
            </div>
          </div>

          {/* 유형별 */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <h2 className="font-bold text-gray-900">유형별 현황</h2>
            <div className="space-y-2">
              {Object.entries(CASE_TYPE_LABELS).map(([key, label]) => {
                const count = byType[key] ?? 0;
                const pct = total > 0 ? (count / total) * 100 : 0;
                return (
                  <div key={key} className="flex items-center gap-3">
                    <span className="text-sm text-gray-600 w-24 flex-shrink-0">{label}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                      <div className="bg-[#1E2D4E] h-full rounded-full flex items-center justify-end pr-2 transition-all"
                           style={{ width: `${Math.max(pct, count > 0 ? 8 : 0)}%` }}>
                        {count > 0 && <span className="text-white text-xs font-bold">{count}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      <div className="flex items-center gap-2 justify-center text-gray-400">
        <FaShieldAlt className="text-xs" />
        <p className="text-xs">변호사-의뢰인 비밀유지 원칙에 따라 개별 상담 내용은 표시되지 않습니다</p>
      </div>
    </div>
  );
}
