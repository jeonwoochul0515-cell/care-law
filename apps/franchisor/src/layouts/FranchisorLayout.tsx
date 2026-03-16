import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import {
  FaHome, FaPalette, FaUsers, FaComments,
  FaCreditCard, FaSignOutAlt, FaBalanceScale,
} from 'react-icons/fa';

const NAV = [
  { icon: FaHome,       label: '대시보드',   path: '/'             },
  { icon: FaPalette,    label: '브랜드 설정', path: '/branding'    },
  { icon: FaUsers,      label: '점주 관리',  path: '/franchisees' },
  { icon: FaComments,   label: '케이스 현황', path: '/cases'       },
  { icon: FaCreditCard, label: '구독 관리',  path: '/subscription'},
];

export default function FranchisorLayout() {
  const { signOut, brand } = useAuthStore();
  const navigate = useNavigate();

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-56 bg-[#0F1E30] flex flex-col flex-shrink-0">
        {/* 로고 */}
        <div className="px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-2 mb-1">
            {brand?.logo_url
              ? <img src={brand.logo_url} alt="" className="w-7 h-7 rounded-lg object-contain bg-white/20 p-0.5" />
              : <FaBalanceScale className="text-[#C9A84C] text-lg" />
            }
            <div>
              <p className="text-white font-bold text-sm">{brand?.app_name ?? '케어로'}</p>
              <p className="text-gray-500 text-xs">가맹본사 어드민</p>
            </div>
          </div>
        </div>

        {/* 네비 */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ icon: Icon, label, path }) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                  isActive
                    ? 'bg-[#C9A84C] text-[#0F1E30] font-bold'
                    : 'text-gray-400 hover:text-white hover:bg-white/10'
                }`
              }
            >
              <Icon className="text-sm flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* 로그아웃 */}
        <div className="px-3 py-4 border-t border-white/10">
          <button
            onClick={async () => { await signOut(); navigate('/login'); }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-white/10 w-full"
          >
            <FaSignOutAlt className="text-sm" /> 로그아웃
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto"><Outlet /></main>
    </div>
  );
}
