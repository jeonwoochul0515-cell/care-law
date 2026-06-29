// 가맹본사 대시보드 — 점주·상담 현황 요약
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
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(false);

  const load = () => {
    if (!brandId) return;
    setLoading(true); setError(false);
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
      setLoading(false);
    }).catch(() => { setError(true); setLoading(false); });
  };

  useEffect(load, [brandId]);

  const CARDS = [
    { icon: FaUsers,               label: '전체 점주',        val: stats.total,    tile: 'bg-brand-tint text-brand' },
    { icon: FaCheckCircle,         label: '활성 점주',        val: stats.active,   tile: 'bg-success-soft text-success' },
    { icon: FaExclamationTriangle, label: '만료 예정 30일 내', val: stats.expiring, tile: 'bg-warn-soft text-warn' },
    { icon: FaComments,            label: '진행 중 상담',      val: stats.openCases,tile: 'bg-gold-soft text-gold' },
  ];

  return (
    <div className="p-5 sm:p-8 max-w-5xl mx-auto">
      {/* 페이지 헤더 */}
      <header className="mb-7">
        <p className="cl-eyebrow mb-1.5">운영 콘솔</p>
        <h1 className="cl-display text-2xl sm:text-3xl">{brand?.name ?? '대시보드'}</h1>
        <hr className="cl-rule-gold w-16 mt-3" />
        {brand?.app_name && <p className="text-ink-soft text-sm mt-3">{brand.app_name} 운영 현황을 한눈에 살펴보세요.</p>}
      </header>

      {error ? (
        <div className="cl-card p-8 text-center">
          <p className="font-semibold text-ink">현황을 불러오지 못했어요</p>
          <p className="text-ink-soft text-sm mt-1 mb-4">잠시 후 다시 시도해 주세요.</p>
          <button onClick={load} className="cl-btn cl-btn-secondary cl-btn-sm">다시 불러오기</button>
        </div>
      ) : (
        <>
          {/* 통계 카드 */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4" aria-label="핵심 지표">
            {CARDS.map(({ icon: Icon, label, val, tile }) => (
              <div key={label} className="cl-card p-4 sm:p-5">
                <div className="flex items-center gap-2.5 mb-3">
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center flex-none ${tile}`}>
                    <Icon className="text-sm" aria-hidden />
                  </span>
                  <span className="text-ink-soft text-xs">{label}</span>
                </div>
                {loading
                  ? <span className="cl-skeleton block h-9 w-14 rounded-md" />
                  : <p className="cl-num text-3xl font-semibold text-ink">{val}</p>}
              </div>
            ))}
          </section>

          {/* 상담 요약 */}
          <section className="cl-card p-5 sm:p-6 mt-4 sm:mt-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-ink">상담 현황 요약</h2>
              <button onClick={() => navigate('/cases')} className="cl-link text-sm">상세 통계</button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: '전체 상담', val: stats.totalCases,  cls: 'cl-card-sunken' },
                { label: '진행 중',   val: stats.openCases,   cls: 'bg-warn-soft border border-line rounded-lg' },
                { label: '종결',      val: stats.closedCases, cls: 'cl-card-sunken' },
              ].map(({ label, val, cls }) => (
                <div key={label} className={`${cls} p-4 text-center`}>
                  <p className="text-ink-soft text-xs">{label}</p>
                  {loading
                    ? <span className="cl-skeleton block h-7 w-10 rounded-md mt-1.5 mx-auto" />
                    : <p className="cl-num text-2xl font-semibold text-ink mt-1">{val}</p>}
                </div>
              ))}
            </div>
            <p className="text-ink-mute text-xs mt-4 text-center">
              변호사-의뢰인 비밀유지 원칙에 따라 개별 상담 내용은 표시되지 않습니다.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
