// LockedPage.tsx
import { useBrandStore } from '../store/brandStore';
import { useAuthStore }  from '../store/authStore';

export function LockedPage() {
  const { brand }   = useBrandStore();
  const { signOut } = useAuthStore();
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center"
         style={{ background: brand?.primary_color ?? '#1E2D4E' }}>
      {brand?.logo_url && <img src={brand.logo_url} alt="" className="w-16 h-16 rounded-full mb-6 object-contain bg-white/20 p-1" />}
      <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center mb-6 text-4xl">🔒</div>
      <h1 className="text-white text-xl font-bold mb-3">서비스 이용 불가</h1>
      <p className="text-white/60 text-sm leading-relaxed mb-8">
        가맹계약 기간 종료로<br />
        <strong className="text-white">{brand?.app_name ?? '법률케어'}</strong> 서비스 이용이 중단되었습니다.<br /><br />
        재이용을 원하시면 가맹본사에 문의해 주세요.
      </p>
      <button onClick={() => window.location.href = 'tel:16604452'}
              className="w-full max-w-xs bg-[#C9A84C] text-[#1E2D4E] font-bold py-3.5 rounded-2xl mb-3">
        본사에 문의하기
      </button>
      <button onClick={signOut} className="text-white/40 text-sm underline">로그아웃</button>
    </div>
  );
}

export default LockedPage;
