import { useNavigate }  from 'react-router-dom';
import { useBrandStore } from '../store/brandStore';
import { useAuthStore }  from '../store/authStore';
import { FaArrowLeft, FaSignOutAlt, FaPhone, FaStore, FaCalendarAlt } from 'react-icons/fa';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';

export default function ProfilePage() {
  const navigate              = useNavigate();
  const { brand }             = useBrandStore();
  const { user, franchisee, signOut } = useAuthStore();
  const brandColor            = brand?.primary_color ?? '#1E2D4E';

  const handleSignOut = async () => {
    if (!window.confirm('로그아웃 하시겠습니까?')) return;
    await signOut();
    navigate('/onboard', { replace: true });
  };

  const INFO = [
    { icon: FaPhone,    label: '연락처',     value: franchisee?.phone ?? '-' },
    { icon: FaStore,    label: '매장명',     value: franchisee?.store_name ?? '-' },
    { icon: FaCalendarAlt, label: '계약 만료', value: franchisee?.contract_expiry
        ? format(parseISO(franchisee.contract_expiry), 'yyyy년 M월 d일', { locale: ko })
        : '미설정' },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="text-white px-4 pt-12 pb-8 safe-top" style={{ background: brandColor }}>
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2">
            <FaArrowLeft className="text-white/80" />
          </button>
          <h1 className="font-bold text-lg">내 정보</h1>
        </div>
        {/* 아바타 */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-20 h-20 rounded-full bg-[#C9A84C] flex items-center justify-center text-[#1E2D4E] text-3xl font-bold">
            {franchisee?.name?.[0] ?? user?.displayName?.[0] ?? '?'}
          </div>
          <p className="text-white font-bold text-xl">{franchisee?.name ?? user?.displayName ?? '-'}</p>
          <p className="text-white/60 text-sm">{brand?.app_name ?? '법률케어'} 이용 중</p>
        </div>
      </header>

      <main className="flex-1 px-4 py-5 space-y-4 pb-24">
        {/* 정보 카드 */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {INFO.map(({ icon: Icon, label, value }, i) => (
            <div key={label} className={`flex items-center gap-4 px-4 py-3.5 ${i > 0 ? 'border-t border-gray-50' : ''}`}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                   style={{ background: brandColor + '15' }}>
                <Icon style={{ color: brandColor }} className="text-sm" />
              </div>
              <div className="flex-1">
                <p className="text-gray-400 text-xs">{label}</p>
                <p className="text-gray-900 text-sm font-medium">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* 서비스 제공 안내 */}
        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
          <p className="text-gray-500 text-xs leading-relaxed text-center">
            이 서비스는 <strong className="text-gray-700">법률사무소 청송</strong>이 운영합니다<br />
            {brand?.app_name}은 가맹본사가 제공하는 법률 복지 서비스입니다
          </p>
        </div>

        {/* 로그아웃 */}
        <button onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-2 bg-white border border-gray-200 rounded-2xl py-3.5 text-red-500 text-sm font-medium">
          <FaSignOutAlt /> 로그아웃
        </button>
      </main>
    </div>
  );
}
