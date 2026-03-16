import { useNavigate }  from 'react-router-dom';
import { useBrandStore } from '../store/brandStore';
import { useAuthStore }  from '../store/authStore';
import {
  FaComments, FaCalendarAlt, FaGavel, FaShieldAlt,
  FaHandshake, FaFolderOpen, FaPhone, FaBell,
} from 'react-icons/fa';

const MENUS = [
  { icon: FaComments,    label: 'AI 법률상담',  sub: '24시간',    path: '/chat',                  accent: true  },
  { icon: FaCalendarAlt, label: '상담 예약',    sub: '변호사 연결', path: '/booking',               accent: false },
  { icon: FaGavel,       label: '형사 사건',    sub: '고소·고발',  path: '/chat?type=criminal',    accent: false },
  { icon: FaShieldAlt,   label: '민사 사건',    sub: '계약·손배',  path: '/chat?type=civil',       accent: false },
  { icon: FaHandshake,   label: '가맹 분쟁',    sub: '계약·해지',  path: '/chat?type=franchise',   accent: false },
  { icon: FaFolderOpen,  label: '문서 관리',    sub: 'AI 분석',   path: '/documents',             accent: false },
];

export default function HomePage() {
  const navigate              = useNavigate();
  const { brand }             = useBrandStore();
  const { user, franchisee }  = useAuthStore();
  const displayName           = franchisee?.name ?? user?.displayName?.split(' ')[0] ?? '점주';
  const brandColor            = brand?.primary_color ?? '#1E2D4E';

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="px-4 pt-12 pb-5 safe-top" style={{ background: brandColor }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {brand?.logo_url
              ? <img src={brand.logo_url} alt="" className="w-7 h-7 rounded-full object-contain bg-white/20 p-0.5" />
              : <div className="w-7 h-7 rounded-full bg-[#C9A84C] flex items-center justify-center text-xs font-bold text-[#1E2D4E]">C</div>
            }
            <span className="font-bold tracking-wide text-sm" style={{ color: '#C9A84C' }}>
              {brand?.app_name ?? '법률케어'}
            </span>
          </div>
          <button onClick={() => navigate('/profile')}
                  className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs text-white">
            👤
          </button>
        </div>

        <p className="text-white/70 text-sm">안녕하세요,</p>
        <p className="text-white font-bold text-lg">{displayName} 점주님 👋</p>

        {/* 빠른 상담 배너 */}
        <button onClick={() => navigate('/chat')}
                className="mt-3 w-full bg-[#C9A84C] rounded-xl px-4 py-2.5 flex items-center gap-2 active:scale-95 transition-transform">
          <FaBell className="text-[#1E2D4E] text-sm flex-shrink-0" />
          <span className="text-[#1E2D4E] font-bold text-sm">법률 문제가 생기셨나요? 즉시 상담 →</span>
        </button>
      </header>

      {/* 메뉴 그리드 */}
      <main className="flex-1 px-4 pt-5 pb-24">
        <p className="text-gray-400 text-xs font-semibold mb-3 tracking-wider">서비스 메뉴</p>
        <div className="grid grid-cols-2 gap-3">
          {MENUS.map(({ icon: Icon, label, sub, path, accent }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`rounded-2xl p-4 flex flex-col gap-2 text-left active:scale-95 transition-transform shadow-sm ${
                accent ? 'text-white' : 'bg-white text-gray-800 border border-gray-100'
              }`}
              style={accent ? { background: brandColor } : undefined}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                accent ? 'bg-white/20' : 'bg-gray-50'
              }`}>
                <Icon className="text-lg" style={{ color: accent ? '#C9A84C' : brandColor }} />
              </div>
              <div>
                <p className={`font-bold text-sm ${accent ? 'text-white' : 'text-gray-800'}`}>{label}</p>
                <p className={`text-xs ${accent ? 'text-white/70' : 'text-gray-400'}`}>{sub}</p>
              </div>
            </button>
          ))}
        </div>

        {/* 긴급 전화 */}
        <button
          onClick={() => window.location.href = 'tel:16604452'}
          className="mt-4 w-full bg-white border border-gray-100 rounded-2xl px-4 py-3.5 flex items-center gap-3 shadow-sm active:scale-95 transition-transform"
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
               style={{ background: brandColor }}>
            <FaPhone className="text-[#C9A84C] text-sm" />
          </div>
          <div className="text-left">
            <p className="font-bold text-sm text-gray-800">긴급 전화 상담</p>
            <p className="text-xs text-gray-400">1660-4452 · 법률사무소 청송</p>
          </div>
          <span className="ml-auto text-gray-300 text-lg">›</span>
        </button>
      </main>
    </div>
  );
}
