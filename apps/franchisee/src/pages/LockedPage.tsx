// 점주 잠금 화면 — 계약 종료 등으로 이용이 중단된 상태 안내 (곁/Care 아트 디렉션)
import { FaLock } from 'react-icons/fa';
import { useBrandStore } from '../store/brandStore';
import { useAuthStore }  from '../store/authStore';

export function LockedPage() {
  const { brand }   = useBrandStore();
  const { signOut } = useAuthStore();
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center bg-paper safe-top safe-bottom">
      {brand?.logo_url && (
        <img src={brand.logo_url} alt={brand.app_name}
             className="w-14 h-14 rounded-xl mb-6 object-contain bg-paper-raised border border-line p-1.5 shadow-card" />
      )}
      <div className="w-16 h-16 rounded-full bg-paper-sunken border border-line flex items-center justify-center mb-6">
        <FaLock className="text-ink-mute text-xl" aria-hidden />
      </div>
      <p className="cl-eyebrow cl-eyebrow-gold">이용 안내</p>
      <h1 className="cl-display text-2xl mt-2 mb-3">잠시 서비스를 쉬어가요</h1>
      <p className="text-ink-soft text-base leading-relaxed mb-8 max-w-xs">
        가맹계약 기간이 끝나면서{' '}
        <strong className="text-ink font-semibold">{brand?.app_name ?? '법률 케어'}</strong>{' '}
        이용이 잠시 멈췄어요. 다시 함께하길 원하시면 가맹본사로 편하게 문의해 주세요.
      </p>
      <button onClick={() => { window.location.href = 'tel:16604452'; }}
              className="cl-btn cl-btn-gold cl-btn-lg cl-btn-block max-w-xs mb-3">
        본사에 문의하기
      </button>
      <button onClick={signOut} className="cl-btn cl-btn-ghost cl-btn-sm">로그아웃</button>
    </div>
  );
}

export default LockedPage;
