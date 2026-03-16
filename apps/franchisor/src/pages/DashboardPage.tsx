import { useEffect, useState } from 'react';
import { supabase } from '@care-law/shared';
import { useAuthStore } from '../store/authStore';
import { FaUsers, FaComments, FaExclamationTriangle, FaCheckCircle } from 'react-icons/fa';
import { differenceInDays, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export default function DashboardPage() {
  const { claims, brand }   = useAuthStore();
  const brandId             = claims?.brand_id ?? '';
  const navigate            = useNavigate();
  const [stats, setStats]   = useState({ total: 0, active: 0, expiring: 0, openCases: 0, totalCases: 0, closedCases: 0 });

  useEffect(() => {
    if (!brandId) return;
    Promise.all([
      supabase.from('carelaw_franchisees').select('active, contract_expiry').eq('brand_id', brandId),
      supabase.from('carelaw_cases').select('status').eq('brand_id', brandId),
    ]).then(([fr, ca]) => {
      const franchisees = fr.data ?? [];
      const cases       = ca.data ?? [];
      const now         = new Date();
      setStats({
        total:       franchisees.length,
        active:      franchisees.filter(f => f.active).length,
        expiring:    franchisees.filter(f => {
          if (!f.contract_expiry) return false;
          const d = differenceInDays(parseISO(f.contract_expiry), now);
          return d >= 0 && d <= 30;
        }).length,
        totalCases:  cases.length,
        openCases:   cases.filter(c => c.status === 'open' || c.status === 'consulting').length,
        closedCases: cases.filter(c => c.status === 'closed').length,
      });
    });
  }, [brandId]);

  const CARDS = [
    { icon: FaUsers,              label: '전체 점주',       val: stats.total,       color: '#1E2D4E' },
    { icon: FaCheckCircle,        label: '활성 점주',       val: stats.active,      color: '#1A6B3C' },
    { icon: FaExclamationTriangle,label: '만료 예정 (30일)', val: stats.expiring,    color: '#C4570A' },
    { icon: FaComments,           label: '진행 중 상담',     val: stats.openCases,   color: '#C9A84C' },
  ];

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{brand?.name ?? '대시보드'}</h1>
        <p className="text-gray-500 text-sm mt-1">{brand?.app_name} 운영 현황</p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {CARDS.map(({ icon: Icon, label, val, color }) => (
          <div key={label} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                   style={{ background: color + '18' }}>
                <Icon style={{ color }} className="text-sm" />
              </div>
              <span className="text-gray-500 text-xs">{label}</span>
            </div>
            <p className="text-3xl font-bold" style={{ color }}>{val}</p>
          </div>
        ))}
      </div>

      {/* 상담 요약 (숫자만) */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900">상담 현황 요약</h2>
          <button onClick={() => navigate('/cases')} className="text-xs text-blue-500">상세 통계 →</button>
        </div>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-gray-500 text-xs">전체 상담</p>
            <p className="text-2xl font-bold text-[#1E2D4E] mt-1">{stats.totalCases}</p>
          </div>
          <div className="bg-yellow-50 rounded-xl p-4">
            <p className="text-yellow-700 text-xs">진행 중</p>
            <p className="text-2xl font-bold text-yellow-700 mt-1">{stats.openCases}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-gray-500 text-xs">종결</p>
            <p className="text-2xl font-bold text-gray-500 mt-1">{stats.closedCases}</p>
          </div>
        </div>
        <p className="text-gray-400 text-xs mt-4 text-center">변호사-의뢰인 비밀유지 원칙에 따라 개별 상담 내용은 표시되지 않습니다</p>
      </div>
    </div>
  );
}
