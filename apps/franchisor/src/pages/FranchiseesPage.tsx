// 점주 관리 — 목록 조회·검색·활성/비활성 전환 (데스크톱 테이블 / 모바일 카드)
import { useEffect, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { supabase, functions } from '@care-law/shared';
import type { Franchisee } from '@care-law/shared';
import { useAuthStore }  from '../store/authStore';
import { differenceInDays, isPast, parseISO } from 'date-fns';
import { FaUserPlus, FaSearch } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

const deactivateFn = httpsCallable(functions, 'deactivateFranchisee');
const activateFn   = httpsCallable(functions, 'activateFranchisee');

type ExpiryInfo = { label: string; variant: string };

export default function FranchiseesPage() {
  const { claims }       = useAuthStore();
  const brandId          = claims?.brand_id ?? '';
  const navigate         = useNavigate();
  const [list, setList]  = useState<Franchisee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toggling, setToggling] = useState<string|null>(null);
  const [pending, setPending] = useState<Franchisee|null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!brandId) return;
    const fetch = () =>
      supabase.from('carelaw_franchisees').select('*')
        .eq('brand_id', brandId)
        .order('created_at', { ascending: false })
        .then(({ data }) => { setList(data ?? []); setLoading(false); });

    fetch();

    const ch = supabase.channel('franchisees')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'carelaw_franchisees',
        filter: `brand_id=eq.${brandId}`,
      }, () => { fetch(); })
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [brandId]);

  const filtered = list.filter(f =>
    (f.name ?? '').includes(search) ||
    (f.store_name ?? '').includes(search) ||
    (f.phone ?? '').includes(search)
  );

  const getExpiry = (exp: string | null): ExpiryInfo | null => {
    if (!exp) return null;
    const d = parseISO(exp);
    const days = differenceInDays(d, new Date());
    if (isPast(d))  return { label: '만료됨', variant: 'cl-badge-danger' };
    if (days <= 30) return { label: `D-${days}`, variant: 'cl-badge-warn' };
    return { label: d.toLocaleDateString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit' }), variant: 'cl-badge-neutral' };
  };

  const runToggle = async (f: Franchisee) => {
    setPending(null);
    setToggling(f.uid); setError('');
    try {
      if (f.active) await deactivateFn({ franchiseeUid: f.uid, brandId });
      else          await activateFn({ franchiseeUid: f.uid, brandId });
    } catch (err: any) {
      setError(err?.message ?? '처리에 실패했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setToggling(null);
    }
  };

  const StatusBadge = ({ active }: { active: boolean }) => (
    <span className={`cl-badge ${active ? 'cl-badge-success' : 'cl-badge-neutral'}`}>
      <span className={`cl-dot ${active ? 'bg-success' : 'bg-ink-mute'}`} aria-hidden />
      {active ? '활성' : '비활성'}
    </span>
  );

  return (
    <div className="p-5 sm:p-8 max-w-5xl mx-auto">
      <header className="flex items-start justify-between gap-4 mb-6">
        <div>
          <p className="cl-eyebrow mb-1.5">운영 콘솔</p>
          <h1 className="cl-display text-2xl sm:text-3xl">점주 관리</h1>
          <hr className="cl-rule-gold w-16 mt-3" />
          <p className="text-ink-soft text-sm mt-3">등록된 점주 <span className="cl-num font-semibold text-ink">{list.length}</span>명</p>
        </div>
        <button onClick={() => navigate('/franchisees/invite')} className="cl-btn cl-btn-primary cl-btn-sm sm:cl-btn flex-none">
          <FaUserPlus aria-hidden /> <span className="hidden sm:inline">점주 초대</span><span className="sm:hidden">초대</span>
        </button>
      </header>

      {/* 검색 */}
      <div className="relative mb-4">
        <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-mute text-sm" aria-hidden />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="이름, 매장명, 연락처로 검색"
          aria-label="점주 검색"
          className="cl-input pl-10"
        />
      </div>

      {error && (
        <p role="alert" className="text-danger text-sm bg-danger-soft rounded-md px-3.5 py-2.5 mb-4">{error}</p>
      )}

      {/* 로딩 스켈레톤 */}
      {loading ? (
        <div className="cl-card divide-y divide-line">
          {[0,1,2].map(i => (
            <div key={i} className="flex items-center justify-between p-4">
              <div className="space-y-2">
                <span className="cl-skeleton block h-4 w-28 rounded" />
                <span className="cl-skeleton block h-3 w-20 rounded" />
              </div>
              <span className="cl-skeleton block h-6 w-16 rounded-full" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        /* 빈 상태 */
        <div className="cl-card p-10 text-center">
          <FaUserPlus className="text-ink-mute text-2xl mx-auto mb-3" aria-hidden />
          <p className="font-semibold text-ink">{search ? '검색 결과가 없어요' : '아직 등록된 점주가 없어요'}</p>
          <p className="text-ink-soft text-sm mt-1 mb-4">
            {search ? '다른 이름이나 매장명으로 검색해 보세요.' : '초대 링크를 보내 첫 점주를 등록해 보세요.'}
          </p>
          {!search && (
            <button onClick={() => navigate('/franchisees/invite')} className="cl-btn cl-btn-secondary cl-btn-sm">
              <FaUserPlus aria-hidden /> 점주 초대하기
            </button>
          )}
        </div>
      ) : (
        <>
          {/* ── 데스크톱 테이블 ───────────────────────── */}
          <div className="hidden md:block cl-card overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="text-2xs uppercase tracking-wide text-ink-mute border-b border-line">
                  <th scope="col" className="font-semibold px-5 py-3">점주 / 매장</th>
                  <th scope="col" className="font-semibold px-5 py-3">계약 만료</th>
                  <th scope="col" className="font-semibold px-5 py-3">상태</th>
                  <th scope="col" className="font-semibold px-5 py-3 text-right">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map(f => {
                  const expiry = getExpiry(f.contract_expiry);
                  return (
                    <tr key={f.id} className="hover:bg-paper-sunken transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-ink text-sm">{f.name ?? '미입력'}</p>
                        <p className="text-ink-mute text-xs">{f.store_name ?? '-'}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        {expiry
                          ? <span className={`cl-badge ${expiry.variant}`}>{expiry.label}</span>
                          : <span className="text-ink-mute text-xs">미설정</span>}
                      </td>
                      <td className="px-5 py-3.5"><StatusBadge active={f.active} /></td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => setPending(f)}
                          disabled={toggling === f.uid}
                          className={`cl-btn cl-btn-sm ${f.active ? 'cl-btn-ghost' : 'cl-btn-secondary'}`}
                        >
                          {toggling === f.uid ? '처리 중…' : f.active ? '비활성화' : '활성화'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── 모바일 카드 ───────────────────────────── */}
          <ul className="md:hidden space-y-3">
            {filtered.map(f => {
              const expiry = getExpiry(f.contract_expiry);
              return (
                <li key={f.id} className="cl-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-ink text-sm truncate">{f.name ?? '미입력'}</p>
                      <p className="text-ink-mute text-xs truncate">{f.store_name ?? '-'}</p>
                    </div>
                    <StatusBadge active={f.active} />
                  </div>
                  <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-line">
                    <span className="text-ink-soft text-xs">
                      계약 만료{' '}
                      {expiry
                        ? <span className={`cl-badge ${expiry.variant} ml-1`}>{expiry.label}</span>
                        : <span className="text-ink-mute">미설정</span>}
                    </span>
                    <button
                      onClick={() => setPending(f)}
                      disabled={toggling === f.uid}
                      className={`cl-btn cl-btn-sm ${f.active ? 'cl-btn-ghost' : 'cl-btn-secondary'}`}
                    >
                      {toggling === f.uid ? '처리 중…' : f.active ? '비활성화' : '활성화'}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {/* ── 활성/비활성 확인 시트 ───────────────────────── */}
      {pending && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => setPending(null)} aria-hidden />
          <div className="relative cl-card shadow-pop w-full sm:max-w-sm m-0 sm:m-4 rounded-b-none sm:rounded-lg p-5 animate-fade-up safe-bottom">
            <h2 id="confirm-title" className="font-semibold text-ink">
              {pending.active ? '점주를 비활성화할까요?' : '점주를 다시 활성화할까요?'}
            </h2>
            <p className="text-ink-soft text-sm mt-1.5">
              {pending.active
                ? <><span className="font-medium text-ink">{pending.name ?? pending.store_name}</span> 점주의 앱 접근이 즉시 차단됩니다.</>
                : <><span className="font-medium text-ink">{pending.name ?? pending.store_name}</span> 점주가 다시 앱을 사용할 수 있게 됩니다.</>}
            </p>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setPending(null)} className="cl-btn cl-btn-secondary cl-btn-block">취소</button>
              <button
                onClick={() => runToggle(pending)}
                className={`cl-btn cl-btn-block ${pending.active ? 'cl-btn-danger' : 'cl-btn-primary'}`}
              >
                {pending.active ? '비활성화' : '활성화'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
