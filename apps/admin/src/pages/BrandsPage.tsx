// 브랜드 관리 — 전체 브랜드 목록 + 신규 브랜드 등록
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { supabase, functions, PLAN_LABELS } from '@care-law/shared';
import type { Brand } from '@care-law/shared';
import { FaPlus, FaTimes, FaSearch } from 'react-icons/fa';
import { ErrorBox } from './DashboardPage';

const createBrandFn = httpsCallable(functions, 'createBrand');

function ActiveBadge({ active }: { active: boolean }) {
  return active ? (
    <span className="cl-badge cl-badge-success"><span className="cl-dot bg-success" />활성</span>
  ) : (
    <span className="cl-badge cl-badge-neutral"><span className="cl-dot bg-ink-mute" />비활성</span>
  );
}

export default function BrandsPage() {
  const navigate = useNavigate();
  const [brands, setBrands]   = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);
  const [search, setSearch]   = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const { data, error } = await supabase.from('carelaw_brands').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setBrands((data as Brand[]) ?? []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = brands.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.subdomain.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-5 md:p-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="cl-eyebrow cl-eyebrow-gold">운영 콘솔</p>
          <h1 className="cl-display mt-1 text-2xl md:text-3xl">브랜드 관리</h1>
          <hr className="cl-rule-gold mt-3 w-12" />
          <p className="mt-2 text-sm text-ink-soft">등록된 브랜드 {brands.length}곳</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="cl-btn cl-btn-primary">
          <FaPlus aria-hidden /> 브랜드 만들기
        </button>
      </header>

      <div className="relative max-w-sm">
        <FaSearch className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-mute" aria-hidden />
        <input
          type="text"
          placeholder="브랜드명 또는 서브도메인 검색"
          value={search}
          onChange={e => setSearch(e.target.value)}
          aria-label="브랜드 검색"
          className="cl-input pl-10"
        />
      </div>

      {error ? (
        <ErrorBox onRetry={load} />
      ) : (
        <section className="cl-card overflow-hidden">
          {loading ? (
            <div className="space-y-3 p-5">
              {[0, 1, 2, 3].map((i) => <div key={i} className="cl-skeleton h-10 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="font-semibold text-ink">
                {search ? '검색 결과가 없어요' : '아직 등록된 브랜드가 없어요'}
              </p>
              <p className="mt-1 text-sm text-ink-soft">
                {search ? '다른 이름이나 서브도메인으로 찾아보세요.' : '첫 브랜드를 만들어 시작해 보세요.'}
              </p>
              {!search && (
                <button onClick={() => setShowCreate(true)} className="cl-btn cl-btn-secondary cl-btn-sm mt-4">
                  <FaPlus aria-hidden /> 브랜드 만들기
                </button>
              )}
            </div>
          ) : (
            <>
              {/* 데스크톱 테이블 */}
              <table className="hidden w-full md:table">
                <thead>
                  <tr className="border-b border-line text-left text-2xs uppercase tracking-wide text-ink-mute">
                    <th className="px-5 py-3 font-semibold">브랜드명</th>
                    <th className="px-5 py-3 font-semibold">앱 이름</th>
                    <th className="px-5 py-3 font-semibold">서브도메인</th>
                    <th className="px-5 py-3 font-semibold">플랜</th>
                    <th className="px-5 py-3 font-semibold">상태</th>
                    <th className="px-5 py-3 font-semibold">등록일</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filtered.map((b) => (
                    <tr
                      key={b.id}
                      onClick={() => navigate(`/brands/${b.id}`)}
                      className="cursor-pointer transition-colors hover:bg-paper-sunken"
                    >
                      <td className="px-5 py-3.5 font-medium text-ink">{b.name}</td>
                      <td className="px-5 py-3.5 text-ink-soft">{b.app_name}</td>
                      <td className="px-5 py-3.5 text-ink-soft">{b.subdomain}</td>
                      <td className="px-5 py-3.5"><span className="cl-badge cl-badge-gold">{PLAN_LABELS[b.plan]}</span></td>
                      <td className="px-5 py-3.5"><ActiveBadge active={b.active} /></td>
                      <td className="cl-num px-5 py-3.5 text-xs text-ink-mute">{new Date(b.created_at).toLocaleDateString('ko-KR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* 모바일 카드 */}
              <ul className="divide-y divide-line md:hidden">
                {filtered.map((b) => (
                  <li key={b.id}>
                    <button
                      onClick={() => navigate(`/brands/${b.id}`)}
                      className="block w-full px-5 py-4 text-left transition-colors hover:bg-paper-sunken"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-ink">{b.name}</p>
                        <ActiveBadge active={b.active} />
                      </div>
                      <p className="mt-1 text-sm text-ink-soft">{b.app_name} · {b.subdomain}.care-law.kr</p>
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <span className="cl-badge cl-badge-gold">{PLAN_LABELS[b.plan]}</span>
                        <span className="cl-num text-xs text-ink-mute">{new Date(b.created_at).toLocaleDateString('ko-KR')}</span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      {showCreate && <CreateBrandModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load(); }} />}
    </div>
  );
}

function CreateBrandModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    name: '', appName: '', subdomain: '', ownerEmail: '', ownerPassword: '', plan: 'free', primaryColor: '#1E2D4E',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  const submit = async () => {
    setLoading(true); setError('');
    try {
      await createBrandFn(form);
      onCreated();
    } catch (err: any) {
      setError(err.message ?? '브랜드를 만들지 못했어요.');
    } finally {
      setLoading(false);
    }
  };

  const plans = [
    { value: 'free', label: 'Free (10명)' },
    { value: 'starter', label: 'Starter (30명)' },
    { value: 'growth', label: 'Growth (100명)' },
    { value: 'enterprise', label: 'Enterprise (999명)' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="cl-card max-h-[92vh] w-full max-w-lg animate-fade-up space-y-5 overflow-y-auto rounded-b-none p-6 shadow-pop sm:rounded-lg">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-ink">새 브랜드 등록</h2>
          <button onClick={onClose} aria-label="닫기" className="grid h-9 w-9 place-items-center rounded-md text-ink-mute hover:bg-paper-sunken hover:text-ink">
            <FaTimes />
          </button>
        </div>

        <div className="space-y-4">
          <Field label="법인명" placeholder="교촌에프앤비" value={form.name} onChange={v => set('name', v)} />
          <Field label="앱 표시명" placeholder="교촌 법률케어" value={form.appName} onChange={v => set('appName', v)} />
          <Field label="서브도메인" placeholder="kyochon" value={form.subdomain} onChange={v => set('subdomain', v.toLowerCase().replace(/[^a-z0-9-]/g, ''))} suffix=".care-law.kr" />
          <Field label="대표 이메일" placeholder="owner@kyochon.com" type="email" value={form.ownerEmail} onChange={v => set('ownerEmail', v)} />
          <Field label="초기 비밀번호" placeholder="8자 이상" type="password" value={form.ownerPassword} onChange={v => set('ownerPassword', v)} />

          <div>
            <label className="cl-label">플랜</label>
            <select value={form.plan} onChange={e => set('plan', e.target.value)} className="cl-input">
              {plans.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>

          <div>
            <label className="cl-label">브랜드 컬러</label>
            <div className="flex items-center gap-3">
              <input type="color" value={form.primaryColor} onChange={e => set('primaryColor', e.target.value)}
                     aria-label="브랜드 컬러 선택" className="h-11 w-12 cursor-pointer rounded-md border border-line-strong bg-paper-raised" />
              <input type="text" value={form.primaryColor} onChange={e => set('primaryColor', e.target.value)}
                     aria-label="브랜드 컬러 코드" className="cl-input cl-num w-36" />
            </div>
          </div>
        </div>

        {error && <p role="alert" className="rounded-md bg-danger-soft px-4 py-2.5 text-sm text-danger">{error}</p>}

        <button onClick={submit} disabled={loading} className="cl-btn cl-btn-primary cl-btn-block">
          {loading ? '만드는 중…' : '브랜드 만들기'}
        </button>
      </div>
    </div>
  );
}

function Field({ label, suffix, ...props }: {
  label: string; placeholder?: string; type?: string; value: string;
  onChange: (v: string) => void; suffix?: string;
}) {
  return (
    <div>
      <label className="cl-label">{label}</label>
      <div className="flex items-stretch">
        <input
          type={props.type ?? 'text'}
          placeholder={props.placeholder}
          value={props.value}
          onChange={e => props.onChange(e.target.value)}
          className={`cl-input ${suffix ? 'rounded-r-none border-r-0' : ''}`}
        />
        {suffix && (
          <span className="flex items-center whitespace-nowrap rounded-r-md border border-l-0 border-line-strong bg-paper-sunken px-3 text-sm text-ink-mute">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}
