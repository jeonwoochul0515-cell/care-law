// 점주 내 정보 — 프로필·계약 정보·로그아웃 (곁/Care 아트 디렉션)
import { useState } from 'react';
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
  const [confirming, setConfirming] = useState(false);

  const handleSignOut = async () => {
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

  const initial = franchisee?.name?.[0] ?? user?.displayName?.[0] ?? '?';

  return (
    <div className="flex flex-col min-h-screen bg-paper">
      <header className="bg-paper-raised border-b border-line safe-top">
        <div className="px-3 pb-3 pt-1 flex items-center gap-2">
          <button onClick={() => navigate(-1)} aria-label="뒤로 가기"
                  className="w-10 h-10 flex items-center justify-center rounded-lg text-ink-soft hover:bg-paper-sunken transition-colors">
            <FaArrowLeft />
          </button>
          <div>
            <p className="cl-eyebrow cl-eyebrow-gold">내 정보</p>
            <h1 className="cl-display text-xl">{franchisee?.name ?? user?.displayName ?? '점주님'}</h1>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-6 space-y-4 pb-24">
        {/* 아바타 */}
        <div className="flex flex-col items-center gap-3 py-2">
          <div className="w-20 h-20 rounded-full flex items-center justify-center bg-gold-soft">
            <span className="cl-display text-3xl text-gold">{initial}</span>
          </div>
          <div className="text-center">
            <p className="cl-display text-xl">{franchisee?.name ?? user?.displayName ?? '점주님'}</p>
            <p className="text-ink-soft text-sm mt-1">{brand?.app_name ?? '법률 케어'} 이용 중</p>
          </div>
        </div>

        {/* 정보 카드 */}
        <div className="cl-card overflow-hidden divide-y divide-line">
          {INFO.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-4 px-4 py-3.5">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-paper-sunken">
                <Icon style={{ color: brandColor }} className="text-sm" aria-hidden />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-ink-mute text-xs">{label}</p>
                <p className="text-ink text-sm font-medium mt-0.5">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* 서비스 제공 안내 */}
        <div className="cl-card-sunken p-4">
          <p className="text-ink-soft text-sm leading-relaxed text-center">
            이 서비스는 <strong className="text-ink font-semibold">법률사무소 청송</strong>이 운영하며,<br />
            {brand?.app_name ?? '법률 케어'}는 가맹본사가 마련한 법률 복지 서비스입니다.
          </p>
        </div>

        {/* 로그아웃 */}
        <button onClick={() => setConfirming(true)}
                className="w-full flex items-center justify-center gap-2 cl-card py-3.5 text-danger text-sm font-semibold active:translate-y-px transition-transform">
          <FaSignOutAlt aria-hidden /> 로그아웃
        </button>
      </main>

      {/* 로그아웃 확인 시트 */}
      {confirming && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 backdrop-blur-sm"
             onClick={() => setConfirming(false)} role="dialog" aria-modal="true" aria-label="로그아웃 확인">
          <div className="w-full max-w-md cl-card shadow-pop rounded-b-none p-6 pb-8 safe-bottom animation-fade-up"
               onClick={e => e.stopPropagation()}>
            <p className="cl-display text-lg text-center">정말 로그아웃할까요?</p>
            <p className="text-ink-soft text-sm text-center mt-1.5">다시 이용하실 땐 이메일로 로그인하시면 돼요.</p>
            <div className="flex flex-col gap-2.5 mt-6">
              <button onClick={handleSignOut} className="cl-btn cl-btn-danger cl-btn-block">로그아웃</button>
              <button onClick={() => setConfirming(false)} className="cl-btn cl-btn-ghost cl-btn-block">그대로 둘게요</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
