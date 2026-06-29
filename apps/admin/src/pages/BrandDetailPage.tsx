// 브랜드 상세 — 정보 수정, 활성/비활성 전환, 소속 점주 목록
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { supabase, functions, PLAN_LABELS, PLAN_LIMITS } from '@care-law/shared';
import type { Brand, Franchisee } from '@care-law/shared';
import { FaEdit, FaSave, FaTimes, FaArrowLeft } from 'react-icons/fa';
import { ErrorBox } from './DashboardPage';

const updateBrandFn = httpsCallable(functions, 'updateBrand');

export default function BrandDetailPage() {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [brand, setBrand]             = useState<Brand | null>(null);
  const [franchisees, setFranchisees] = useState<Franchisee[]>([]);
  const [caseCount, setCaseCount]     = useState(0);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(false);
  const [editing, setEditing]         = useState(false);
  const [editForm, setEditForm]       = useState({ name: '', appName: '', plan: '', primaryColor: '' });
  const [saving, setSaving]           = useState(false);
  const [toggling, setToggling]       = useState(false);
  const [confirmToggle, setConfirmToggle] = useState(false);
  const [actionError, setActionError] = useState('');

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setError(false);
    try {
      const [b, f, c] = await Promise.all([
        supabase.from('carelaw_brands').select('*').eq('id', id).single(),
        supabase.from('carelaw_franchisees').select('*').eq('brand_id', id).order('created_at', { ascending: false }),
        supabase.from('carelaw_cases').select('*', { count: 'exact', head: true }).eq('brand_id', id),
      ]);
      if (b.error) throw b.error;
      const brandData = b.data as Brand;
      setBrand(brandData);
      setFranchisees((f.data as Franchisee[]) ?? []);
      setCaseCount(c.count ?? 0);
      if (brandData) {
        setEditForm({ name: brandData.name, appName: brandData.app_name, plan: brandData.plan, primaryColor: brandData.primary_color });
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const save = async () => {
    if (!id) return;
    setSaving(true);
    setActionError('');
    try {
      await updateBrandFn({ brandId: id, name: editForm.name, appName: editForm.appName, plan: editForm.plan, primaryColor: editForm.primaryColor });
      setEditing(false);
      load();
    } catch (err: any) {
      setActionError(err.message ?? '수정 내용을 저장하지 못했어요.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async () => {
    if (!id || !brand) return;
    const next = !brand.active;
    setToggling(true);
    setActionError('');
    setConfirmToggle(false);
    try {
      await updateBrandFn({ brandId: id, active: next });
      load();
    } catch (err: any) {
      setActionError(err.message ?? '상태를 변경하지 못했어요.');
    } finally {
      setToggling(false);
    }
  };

  const backLink = (
    <button onClick={() => navigate('/brands')} className="inline-flex items-center gap-2 text-sm text-ink-soft transition-colors hover:text-ink">
      <FaArrowLeft className="text-xs" aria-hidden /> 브랜드 목록
    </button>
  );

  if (loading) return (
    <div className="mx-auto max-w-4xl space-y-6 p-5 md:p-8">
      <div className="cl-skeleton h-5 w-28" />
      <div className="cl-skeleton h-40 w-full rounded-lg" />
      <div className="cl-skeleton h-64 w-full rounded-lg" />
    </div>
  );

  if (error) return (
    <div className="mx-auto max-w-4xl space-y-6 p-5 md:p-8">
      {backLink}
      <ErrorBox onRetry={load} />
    </div>
  );

  if (!brand) return (
    <div className="mx-auto max-w-4xl space-y-6 p-5 md:p-8">
      {backLink}
      <div className="cl-card p-10 text-center">
        <p className="font-semibold text-ink">브랜드를 찾을 수 없어요</p>
        <p className="mt-1 text-sm text-ink-soft">삭제되었거나 잘못된 주소일 수 있어요.</p>
      </div>
    </div>
  );

  const limit = PLAN_LIMITS[brand.plan];
  const activeCount = franchisees.filter(f => f.active).length;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-5 md:p-8">
      {backLink}

      {/* 브랜드 헤더 */}
      <section className="cl-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            {editing ? (
              <div className="space-y-2">
                <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                       aria-label="법인명" className="cl-input font-display text-lg" />
                <input value={editForm.appName} onChange={e => setEditForm(f => ({ ...f, appName: e.target.value }))}
                       placeholder="앱 표시명" aria-label="앱 표시명" className="cl-input" />
              </div>
            ) : (
              <>
                <p className="cl-eyebrow cl-eyebrow-gold">브랜드</p>
                <h1 className="cl-display mt-1 text-2xl">{brand.name}</h1>
                <p className="mt-1.5 text-sm text-ink-soft">{brand.app_name} · {brand.subdomain}.care-law.kr</p>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {editing ? (
              <>
                <select value={editForm.plan} onChange={e => setEditForm(f => ({ ...f, plan: e.target.value }))}
                        aria-label="플랜" className="cl-input h-9 w-auto py-0 text-sm">
                  {Object.entries(PLAN_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <button onClick={save} disabled={saving} className="cl-btn cl-btn-primary cl-btn-sm">
                  <FaSave aria-hidden /> {saving ? '저장 중…' : '저장'}
                </button>
                <button onClick={() => { setEditing(false); setActionError(''); }} className="cl-btn cl-btn-secondary cl-btn-sm">취소</button>
              </>
            ) : (
              <>
                <span className="cl-badge cl-badge-gold">{PLAN_LABELS[brand.plan]}</span>
                {brand.active
                  ? <span className="cl-badge cl-badge-success"><span className="cl-dot bg-success" />활성</span>
                  : <span className="cl-badge cl-badge-neutral"><span className="cl-dot bg-ink-mute" />비활성</span>}
                <button onClick={() => setEditing(true)} aria-label="브랜드 정보 수정"
                        className="grid h-9 w-9 place-items-center rounded-md text-ink-mute hover:bg-paper-sunken hover:text-ink">
                  <FaEdit />
                </button>
              </>
            )}
          </div>
        </div>

        {/* 활성 전환 + 확인 */}
        {!editing && (
          <div className="mt-4 border-t border-line pt-4">
            {confirmToggle ? (
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm text-ink-soft">
                  {brand.name}을(를) {brand.active ? '비활성화' : '활성화'}할까요?
                </p>
                <div className="flex gap-2">
                  <button onClick={toggleActive} disabled={toggling}
                          className={`cl-btn cl-btn-sm ${brand.active ? 'cl-btn-danger' : 'cl-btn-primary'}`}>
                    {toggling ? '변경 중…' : brand.active ? '비활성화' : '활성화'}
                  </button>
                  <button onClick={() => setConfirmToggle(false)} className="cl-btn cl-btn-ghost cl-btn-sm">취소</button>
                </div>
              </div>
            ) : (
              <button onClick={() => { setConfirmToggle(true); setActionError(''); }}
                      className="cl-btn cl-btn-secondary cl-btn-sm">
                {brand.active ? '브랜드 비활성화' : '브랜드 활성화'}
              </button>
            )}
          </div>
        )}

        {actionError && (
          <p role="alert" className="mt-3 rounded-md bg-danger-soft px-4 py-2.5 text-sm text-danger">{actionError}</p>
        )}

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="cl-card-sunken p-4">
            <p className="text-xs text-ink-mute">점주 수</p>
            <p className="cl-num mt-1 text-xl font-semibold text-ink">
              {activeCount} <span className="text-sm font-normal text-ink-mute">/ {limit.maxFranchisees === 999 ? '무제한' : limit.maxFranchisees}</span>
            </p>
          </div>
          <div className="cl-card-sunken p-4">
            <p className="text-xs text-ink-mute">총 케이스</p>
            <p className="cl-num mt-1 text-xl font-semibold text-ink">{caseCount}</p>
          </div>
          <div className="cl-card-sunken p-4">
            <p className="text-xs text-ink-mute">대표 이메일</p>
            <p className="mt-1 truncate text-sm font-medium text-ink">{brand.owner_email}</p>
          </div>
        </div>
      </section>

      {/* 점주 목록 */}
      <section className="cl-card overflow-hidden">
        <div className="border-b border-line px-5 py-4">
          <h2 className="font-semibold text-ink">소속 점주 <span className="cl-num text-ink-mute">{franchisees.length}</span>명</h2>
        </div>

        {franchisees.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="font-semibold text-ink">아직 소속 점주가 없어요</p>
            <p className="mt-1 text-sm text-ink-soft">점주가 초대 링크로 가입하면 여기에 표시돼요.</p>
          </div>
        ) : (
          <>
            <table className="hidden w-full md:table">
              <thead>
                <tr className="border-b border-line text-left text-2xs uppercase tracking-wide text-ink-mute">
                  <th className="px-5 py-3 font-semibold">이름</th>
                  <th className="px-5 py-3 font-semibold">매장명</th>
                  <th className="px-5 py-3 font-semibold">연락처</th>
                  <th className="px-5 py-3 font-semibold">상태</th>
                  <th className="px-5 py-3 font-semibold">가입일</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {franchisees.map((f) => (
                  <tr key={f.id} className="transition-colors hover:bg-paper-sunken">
                    <td className="px-5 py-3.5 font-medium text-ink">{f.name ?? '-'}</td>
                    <td className="px-5 py-3.5 text-ink-soft">{f.store_name ?? '-'}</td>
                    <td className="cl-num px-5 py-3.5 text-ink-soft">{f.phone ?? '-'}</td>
                    <td className="px-5 py-3.5">
                      {f.active
                        ? <span className="cl-badge cl-badge-success"><span className="cl-dot bg-success" />활성</span>
                        : <span className="cl-badge cl-badge-neutral"><span className="cl-dot bg-ink-mute" />비활성</span>}
                    </td>
                    <td className="cl-num px-5 py-3.5 text-xs text-ink-mute">{new Date(f.created_at).toLocaleDateString('ko-KR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <ul className="divide-y divide-line md:hidden">
              {franchisees.map((f) => (
                <li key={f.id} className="px-5 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-ink">{f.name ?? '이름 미등록'}</p>
                    {f.active
                      ? <span className="cl-badge cl-badge-success"><span className="cl-dot bg-success" />활성</span>
                      : <span className="cl-badge cl-badge-neutral"><span className="cl-dot bg-ink-mute" />비활성</span>}
                  </div>
                  <p className="mt-1 text-sm text-ink-soft">{f.store_name ?? '매장명 미등록'}</p>
                  <div className="mt-1.5 flex items-center justify-between gap-3 text-xs text-ink-mute">
                    <span className="cl-num">{f.phone ?? '연락처 없음'}</span>
                    <span className="cl-num">{new Date(f.created_at).toLocaleDateString('ko-KR')}</span>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
