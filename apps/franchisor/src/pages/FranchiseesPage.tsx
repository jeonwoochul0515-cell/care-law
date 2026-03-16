import { useEffect, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { supabase, functions } from '@care-law/shared';
import type { Franchisee } from '@care-law/shared';
import { useAuthStore }  from '../store/authStore';
import { differenceInDays, isPast, parseISO } from 'date-fns';
import { FaUserPlus, FaToggleOn, FaToggleOff, FaSearch } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

const deactivateFn = httpsCallable(functions, 'deactivateFranchisee');
const activateFn   = httpsCallable(functions, 'activateFranchisee');

export default function FranchiseesPage() {
  const { claims }       = useAuthStore();
  const brandId          = claims?.brand_id ?? '';
  const navigate         = useNavigate();
  const [list, setList]  = useState<Franchisee[]>([]);
  const [search, setSearch] = useState('');
  const [toggling, setToggling] = useState<string|null>(null);

  useEffect(() => {
    if (!brandId) return;
    // 초기 로드
    supabase.from('carelaw_franchisees').select('*')
      .eq('brand_id', brandId)
      .order('created_at', { ascending: false })
      .then(({ data }) => setList(data ?? []));

    // Realtime 구독
    const ch = supabase.channel('franchisees')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'carelaw_franchisees',
        filter: `brand_id=eq.${brandId}`,
      }, () => {
        supabase.from('carelaw_franchisees').select('*')
          .eq('brand_id', brandId)
          .order('created_at', { ascending: false })
          .then(({ data }) => setList(data ?? []));
      })
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [brandId]);

  const filtered = list.filter(f =>
    (f.name ?? '').includes(search) ||
    (f.store_name ?? '').includes(search) ||
    (f.phone ?? '').includes(search)
  );

  const getExpiry = (exp: string | null) => {
    if (!exp) return null;
    const d = parseISO(exp);
    const days = differenceInDays(d, new Date());
    if (isPast(d))  return { label: '만료됨',    color: '#B83232', bg: '#FDEAEA' };
    if (days <= 30) return { label: `D-${days}`, color: '#C4570A', bg: '#FDF4EC' };
    return             { label: d.toLocaleDateString('ko-KR', { year:'2-digit', month:'2-digit', day:'2-digit' }), color: '#6B7280', bg: '#F0EEE9' };
  };

  const toggle = async (f: Franchisee) => {
    if (toggling) return;
    const ok = window.confirm(f.active
      ? `${f.name ?? f.store_name} 점주를 비활성화합니다. 즉시 앱 접근이 차단됩니다.`
      : `${f.name ?? f.store_name} 점주를 다시 활성화합니다.`);
    if (!ok) return;
    setToggling(f.uid);
    try {
      if (f.active) await deactivateFn({ franchiseeUid: f.uid, brandId });
      else          await activateFn({ franchiseeUid: f.uid, brandId });
    } catch (err: any) {
      alert(err.message ?? '처리 실패');
    } finally {
      setToggling(null);
    }
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">점주 관리</h1>
          <p className="text-gray-500 text-sm mt-0.5">총 {list.length}명</p>
        </div>
        <button onClick={() => navigate('/franchisees/invite')}
                className="flex items-center gap-2 bg-[#1E2D4E] text-white px-4 py-2.5 rounded-xl text-sm font-bold">
          <FaUserPlus className="text-[#C9A84C]" /> 점주 초대
        </button>
      </div>

      <div className="relative">
        <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300 text-sm" />
        <input value={search} onChange={e => setSearch(e.target.value)}
               placeholder="이름, 매장명, 연락처"
               className="w-full pl-9 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm outline-none" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-4 px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs text-gray-500 font-semibold">
          <span>점주 / 매장</span><span>계약 만료</span><span>상태</span><span>관리</span>
        </div>
        {filtered.length === 0
          ? <p className="text-gray-400 text-sm text-center py-10">{search ? '검색 결과 없음' : '등록된 점주가 없습니다'}</p>
          : filtered.map(f => {
            const expiry = getExpiry(f.contract_expiry);
            return (
              <div key={f.id} className="grid grid-cols-[1fr_1fr_auto_auto] gap-4 px-5 py-4 border-b border-gray-50 last:border-0 items-center">
                <div>
                  <p className="font-medium text-gray-900 text-sm">{f.name ?? '미입력'}</p>
                  <p className="text-gray-400 text-xs">{f.store_name ?? '-'}</p>
                </div>
                <div>
                  {expiry
                    ? <span className="text-xs px-2 py-1 rounded-full font-medium"
                            style={{ color: expiry.color, background: expiry.bg }}>{expiry.label}</span>
                    : <span className="text-gray-300 text-xs">미설정</span>}
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${f.active ? 'text-green-700 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                  {f.active ? '활성' : '비활성'}
                </span>
                <button onClick={() => toggle(f)} disabled={toggling === f.uid} className="disabled:opacity-50">
                  {f.active
                    ? <FaToggleOn  className="text-2xl text-green-500" />
                    : <FaToggleOff className="text-2xl text-gray-300" />}
                </button>
              </div>
            );
          })
        }
      </div>
    </div>
  );
}
