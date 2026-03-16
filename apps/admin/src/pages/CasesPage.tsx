import { useEffect, useState } from 'react';
import { supabase, CASE_TYPE_LABELS, CASE_STATUS_LABELS } from '@care-law/shared';
import type { Case } from '@care-law/shared';

const STATUS_STYLE: Record<string, string> = {
  open: 'bg-yellow-50 text-yellow-700',
  consulting: 'bg-blue-50 text-blue-700',
  retained: 'bg-purple-50 text-purple-700',
  closed: 'bg-gray-100 text-gray-500',
};

export default function CasesPage() {
  const [cases, setCases]     = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('all');

  useEffect(() => {
    supabase.from('carelaw_cases').select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => { setCases(data as Case[] ?? []); setLoading(false); });
  }, []);

  const filtered = filter === 'all' ? cases : cases.filter(c => c.status === filter);

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">전체 케이스</h1>
        <p className="text-gray-500 text-sm mt-0.5">시스템 전체 법률 상담 현황 ({cases.length}건)</p>
      </div>

      {/* 필터 */}
      <div className="flex gap-2 flex-wrap">
        {[['all', '전체'], ['open', '상담중'], ['consulting', '검토중'], ['retained', '수임'], ['closed', '종결']].map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    filter === val ? 'bg-[#1E2D4E] text-white' : 'bg-white text-gray-600 border border-gray-200'
                  }`}>
            {label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {['제목', '유형', '상태', '생성일'].map(h => (
                <th key={h} className="px-5 py-3 text-left text-xs text-gray-500 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="text-center py-10 text-gray-400">로딩 중...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-10 text-gray-400">케이스가 없습니다</td></tr>
            ) : filtered.map(c => (
              <tr key={c.id} className="border-t border-gray-50">
                <td className="px-5 py-3 font-medium text-gray-900">{c.title}</td>
                <td className="px-5 py-3 text-gray-600">{CASE_TYPE_LABELS[c.type]}</td>
                <td className="px-5 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${STATUS_STYLE[c.status] ?? ''}`}>
                    {CASE_STATUS_LABELS[c.status]}
                  </span>
                </td>
                <td className="px-5 py-3 text-gray-400 text-xs">
                  {new Date(c.created_at).toLocaleDateString('ko-KR')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
