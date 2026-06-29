// 케이스 통계 — 소속 점주 법률 상담의 상태별·유형별 집계
import { useEffect, useState } from 'react';
import { supabase, CASE_TYPE_LABELS, CASE_STATUS_LABELS } from '@care-law/shared';
import { useAuthStore } from '../store/authStore';
import { FaShieldAlt } from 'react-icons/fa';

// 상태 → 디자인 시스템 배지 매핑
const STATUS_BADGE: Record<string, string> = {
  open:       'cl-badge-success',
  consulting: 'cl-badge-warn',
  retained:   'cl-badge-brand',
  closed:     'cl-badge-neutral',
};

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

  return (
    <div className="p-5 sm:p-8 max-w-2xl mx-auto">
      <header className="mb-7">
        <p className="cl-eyebrow mb-1.5">운영 콘솔</p>
        <h1 className="cl-display text-2xl sm:text-3xl">케이스 통계</h1>
        <hr className="cl-rule-gold w-16 mt-3" />
        <p className="text-ink-soft text-sm mt-3">소속 점주의 법률 상담 현황을 집계해 보여드립니다.</p>
      </header>

      {loading ? (
        <div className="space-y-4">
          <span className="cl-skeleton block h-24 rounded-lg" />
          <span className="cl-skeleton block h-40 rounded-lg" />
          <span className="cl-skeleton block h-48 rounded-lg" />
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-5">
          {/* 전체 건수 */}
          <div className="cl-card p-6 text-center">
            <p className="text-ink-soft text-sm">전체 상담 건수</p>
            <p className="cl-num text-4xl font-semibold text-ink mt-1">{total}<span className="text-2xl">건</span></p>
          </div>

          {/* 상태별 */}
          <section className="cl-card p-5 sm:p-6">
            <h2 className="font-semibold text-ink mb-4">상태별 현황</h2>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(CASE_STATUS_LABELS).map(([key, label]) => (
                <div key={key} className="cl-card-sunken p-4">
                  <span className={`cl-badge ${STATUS_BADGE[key] ?? 'cl-badge-neutral'}`}>{label}</span>
                  <p className="cl-num text-2xl font-semibold text-ink mt-2">{byStatus[key] ?? 0}<span className="text-base font-normal text-ink-soft">건</span></p>
                </div>
              ))}
            </div>
          </section>

          {/* 유형별 */}
          <section className="cl-card p-5 sm:p-6">
            <h2 className="font-semibold text-ink mb-4">유형별 현황</h2>
            <div className="space-y-3">
              {Object.entries(CASE_TYPE_LABELS).map(([key, label]) => {
                const count = byType[key] ?? 0;
                const pct = total > 0 ? (count / total) * 100 : 0;
                return (
                  <div key={key} className="flex items-center gap-3">
                    <span className="text-sm text-ink-soft w-20 flex-none">{label}</span>
                    <div className="flex-1 bg-paper-sunken rounded-full h-6 overflow-hidden">
                      <div
                        className="bg-brand h-full rounded-full flex items-center justify-end pr-2 transition-all"
                        style={{ width: `${Math.max(pct, count > 0 ? 12 : 0)}%` }}
                      >
                        {count > 0 && <span className="cl-num text-white text-xs font-semibold">{count}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}

      <div className="flex items-center gap-2 justify-center text-ink-mute mt-6">
        <FaShieldAlt className="text-xs flex-none" aria-hidden />
        <p className="text-xs">변호사-의뢰인 비밀유지 원칙에 따라 개별 상담 내용은 표시되지 않습니다.</p>
      </div>
    </div>
  );
}
