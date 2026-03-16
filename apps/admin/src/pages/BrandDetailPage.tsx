import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { supabase, functions, PLAN_LABELS, PLAN_LIMITS } from '@care-law/shared';
import type { Brand, Franchisee } from '@care-law/shared';
import { FaEdit, FaSave, FaTimes } from 'react-icons/fa';

const updateBrandFn = httpsCallable(functions, 'updateBrand');

export default function BrandDetailPage() {
  const { id }       = useParams<{ id: string }>();
  const navigate     = useNavigate();
  const [brand, setBrand]           = useState<Brand | null>(null);
  const [franchisees, setFranchisees] = useState<Franchisee[]>([]);
  const [caseCount, setCaseCount]   = useState(0);
  const [loading, setLoading]       = useState(true);
  const [editing, setEditing]       = useState(false);
  const [editForm, setEditForm]     = useState({ name: '', appName: '', plan: '', primaryColor: '' });
  const [saving, setSaving]         = useState(false);
  const [toggling, setToggling]     = useState(false);

  const load = () => {
    if (!id) return;
    Promise.all([
      supabase.from('carelaw_brands').select('*').eq('id', id).single(),
      supabase.from('carelaw_franchisees').select('*').eq('brand_id', id).order('created_at', { ascending: false }),
      supabase.from('carelaw_cases').select('*', { count: 'exact', head: true }).eq('brand_id', id),
    ]).then(([b, f, c]) => {
      const brandData = b.data as Brand;
      setBrand(brandData);
      setFranchisees(f.data as Franchisee[] ?? []);
      setCaseCount(c.count ?? 0);
      setLoading(false);
      if (brandData) {
        setEditForm({ name: brandData.name, appName: brandData.app_name, plan: brandData.plan, primaryColor: brandData.primary_color });
      }
    });
  };

  useEffect(() => { load(); }, [id]);

  const save = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await updateBrandFn({ brandId: id, name: editForm.name, appName: editForm.appName, plan: editForm.plan, primaryColor: editForm.primaryColor });
      setEditing(false);
      load();
    } catch (err: any) {
      alert(err.message ?? '수정 실패');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async () => {
    if (!id || !brand) return;
    const next = !brand.active;
    if (!confirm(`${brand.name}을(를) ${next ? '활성화' : '비활성화'}하시겠습니까?`)) return;
    setToggling(true);
    try {
      await updateBrandFn({ brandId: id, active: next });
      load();
    } catch (err: any) {
      alert(err.message ?? '변경 실패');
    } finally {
      setToggling(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!brand) return (
    <div className="p-6 text-center text-gray-400">브랜드를 찾을 수 없습니다</div>
  );

  const limit = PLAN_LIMITS[brand.plan];
  const activeCount = franchisees.filter(f => f.active).length;

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <button onClick={() => navigate('/brands')}
              className="text-sm text-gray-500 hover:text-gray-700">&larr; 브랜드 목록</button>

      {/* 브랜드 헤더 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-start justify-between">
          <div>
            {editing ? (
              <div className="space-y-3">
                <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                       className="text-2xl font-bold text-gray-900 border border-gray-200 rounded-lg px-3 py-1 outline-none focus:border-[#C9A84C]" />
                <input value={editForm.appName} onChange={e => setEditForm(f => ({ ...f, appName: e.target.value }))}
                       placeholder="앱 표시명"
                       className="text-sm text-gray-500 border border-gray-200 rounded-lg px-3 py-1 outline-none focus:border-[#C9A84C] block" />
              </div>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-gray-900">{brand.name}</h1>
                <p className="text-gray-500 text-sm">{brand.app_name} &middot; {brand.subdomain}.care-law.kr</p>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {editing ? (
              <>
                <select value={editForm.plan} onChange={e => setEditForm(f => ({ ...f, plan: e.target.value }))}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1 outline-none">
                  {Object.entries(PLAN_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <button onClick={save} disabled={saving}
                        className="p-2 bg-green-500 text-white rounded-lg"><FaSave /></button>
                <button onClick={() => setEditing(false)}
                        className="p-2 bg-gray-200 text-gray-600 rounded-lg"><FaTimes /></button>
              </>
            ) : (
              <>
                <span className="text-xs px-3 py-1 rounded-full bg-[#1E2D4E] text-[#C9A84C] font-bold">
                  {PLAN_LABELS[brand.plan]}
                </span>
                <button onClick={toggleActive} disabled={toggling}
                        className={`text-xs px-3 py-1 rounded-full font-medium ${brand.active ? 'bg-green-50 text-green-700 hover:bg-red-50 hover:text-red-600' : 'bg-red-50 text-red-600 hover:bg-green-50 hover:text-green-700'}`}>
                  {toggling ? '...' : brand.active ? '활성' : '비활성'}
                </button>
                <button onClick={() => setEditing(true)}
                        className="p-2 text-gray-400 hover:text-gray-600"><FaEdit /></button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-gray-500 text-xs">점주 수</p>
            <p className="text-xl font-bold text-gray-900">{activeCount} / {limit.maxFranchisees === 999 ? '무제한' : limit.maxFranchisees}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-gray-500 text-xs">총 케이스</p>
            <p className="text-xl font-bold text-gray-900">{caseCount}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-gray-500 text-xs">대표 이메일</p>
            <p className="text-sm font-medium text-gray-900 truncate">{brand.owner_email}</p>
          </div>
        </div>
      </div>

      {/* 점주 목록 */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h2 className="font-bold text-gray-900">소속 점주 ({franchisees.length}명)</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {['이름', '매장명', '연락처', '상태', '가입일'].map(h => (
                <th key={h} className="px-5 py-3 text-left text-xs text-gray-500 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {franchisees.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-10 text-gray-400">소속 점주가 없습니다</td></tr>
            ) : franchisees.map(f => (
              <tr key={f.id} className="border-t border-gray-50">
                <td className="px-5 py-3 text-gray-900">{f.name ?? '-'}</td>
                <td className="px-5 py-3 text-gray-600">{f.store_name ?? '-'}</td>
                <td className="px-5 py-3 text-gray-500">{f.phone ?? '-'}</td>
                <td className="px-5 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${f.active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                    {f.active ? '활성' : '비활성'}
                  </span>
                </td>
                <td className="px-5 py-3 text-gray-400 text-xs">
                  {new Date(f.created_at).toLocaleDateString('ko-KR')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
