import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { supabase, functions, PLAN_LABELS } from '@care-law/shared';
import type { Brand } from '@care-law/shared';
import { FaPlus, FaTimes } from 'react-icons/fa';

const createBrandFn = httpsCallable(functions, 'createBrand');

export default function BrandsPage() {
  const navigate = useNavigate();
  const [brands, setBrands]   = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const load = () => {
    supabase.from('carelaw_brands').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { setBrands(data as Brand[] ?? []); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const filtered = brands.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.subdomain.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">브랜드 관리</h1>
          <p className="text-gray-500 text-sm mt-0.5">등록된 모든 브랜드 ({brands.length})</p>
        </div>
        <button onClick={() => setShowCreate(true)}
                className="bg-[#1E2D4E] text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2">
          <FaPlus className="text-[#C9A84C]" /> 브랜드 추가
        </button>
      </div>

      <input
        type="text"
        placeholder="브랜드명 또는 서브도메인 검색..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full max-w-sm bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#C9A84C]"
      />

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {['브랜드명', '앱 이름', '서브도메인', '플랜', '상태', '등록일'].map(h => (
                <th key={h} className="px-5 py-3 text-left text-xs text-gray-500 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-10 text-gray-400">로딩 중...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-10 text-gray-400">검색 결과가 없습니다</td></tr>
            ) : filtered.map(b => (
              <tr key={b.id}
                  onClick={() => navigate(`/brands/${b.id}`)}
                  className="border-t border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3 font-medium text-gray-900">{b.name}</td>
                <td className="px-5 py-3 text-gray-600">{b.app_name}</td>
                <td className="px-5 py-3 text-gray-500">{b.subdomain}</td>
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
                <td className="px-5 py-3 text-gray-400 text-xs">
                  {new Date(b.created_at).toLocaleDateString('ko-KR')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
      setError(err.message ?? '생성 실패');
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
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">새 브랜드 등록</h2>
          <button onClick={onClose} className="p-2"><FaTimes className="text-gray-400" /></button>
        </div>

        <div className="space-y-4">
          <Field label="법인명 *" placeholder="교촌에프앤비" value={form.name} onChange={v => set('name', v)} />
          <Field label="앱 표시명 *" placeholder="교촌 법률케어" value={form.appName} onChange={v => set('appName', v)} />
          <Field label="서브도메인 *" placeholder="kyochon" value={form.subdomain} onChange={v => set('subdomain', v.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                 suffix=".care-law.kr" />
          <Field label="대표 이메일 *" placeholder="owner@kyochon.com" type="email" value={form.ownerEmail} onChange={v => set('ownerEmail', v)} />
          <Field label="초기 비밀번호 *" placeholder="8자 이상" type="password" value={form.ownerPassword} onChange={v => set('ownerPassword', v)} />

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">플랜</label>
            <select value={form.plan} onChange={e => set('plan', e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#C9A84C]">
              {plans.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">브랜드 컬러</label>
            <div className="flex items-center gap-3">
              <input type="color" value={form.primaryColor} onChange={e => set('primaryColor', e.target.value)}
                     className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer" />
              <input type="text" value={form.primaryColor} onChange={e => set('primaryColor', e.target.value)}
                     className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm w-32 outline-none" />
            </div>
          </div>
        </div>

        {error && <p className="text-red-500 text-sm bg-red-50 px-4 py-2 rounded-xl">{error}</p>}

        <button onClick={submit} disabled={loading}
                className="w-full bg-[#1E2D4E] text-white py-3 rounded-xl font-bold disabled:opacity-50">
          {loading ? '생성 중...' : '브랜드 등록'}
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
      <label className="text-sm font-medium text-gray-700 block mb-1.5">{label}</label>
      <div className="flex items-center">
        <input
          type={props.type ?? 'text'}
          placeholder={props.placeholder}
          value={props.value}
          onChange={e => props.onChange(e.target.value)}
          className={`w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#C9A84C] ${suffix ? 'rounded-r-none border-r-0' : ''}`}
        />
        {suffix && (
          <span className="bg-gray-50 border border-gray-200 rounded-r-xl px-3 py-2.5 text-sm text-gray-500 whitespace-nowrap">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}
