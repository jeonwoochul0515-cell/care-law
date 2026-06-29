// 가맹본사 콘솔 셸 — 데스크톱 사이드바 + 모바일 상단바/드로어
import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import {
  FaHome, FaPalette, FaUsers, FaComments,
  FaCreditCard, FaSignOutAlt, FaBalanceScale, FaBars, FaTimes,
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
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleSignOut = async () => { await signOut(); navigate('/login'); };

  const BrandMark = ({ subtle = false }: { subtle?: boolean }) => (
    <div className="flex items-center gap-2.5 min-w-0">
      {brand?.logo_url
        ? <img src={brand.logo_url} alt="" className="w-8 h-8 rounded-lg object-contain bg-white/15 p-0.5 flex-none" />
        : <span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-none">
            <FaBalanceScale className="text-gold text-base" aria-hidden />
          </span>
      }
      <span className="min-w-0">
        <span className="block text-paper font-semibold text-sm truncate">{brand?.app_name ?? '케어로'}</span>
        <span className={`block text-2xs tracking-wide ${subtle ? 'text-paper/45' : 'text-paper/50'}`}>가맹본사 콘솔</span>
      </span>
    </div>
  );

  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    `relative flex items-center gap-3 pl-4 pr-3 py-2.5 rounded-lg text-sm transition-colors ${
      isActive
        ? 'bg-white/10 text-paper font-semibold'
        : 'text-paper/55 hover:text-paper hover:bg-white/5'
    }`;

  const NavItems = ({ onNavigate }: { onNavigate?: () => void }) => (
    <>
      {NAV.map(({ icon: Icon, label, path }) => (
        <NavLink key={path} to={path} end={path === '/'} onClick={onNavigate} className={navItemClass}>
          {({ isActive }) => (
            <>
              {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-full bg-gold" aria-hidden />}
              <Icon className="text-sm flex-none" aria-hidden />
              <span>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </>
  );

  return (
    <div className="flex h-screen bg-paper">
      {/* ── 데스크톱 사이드바 ───────────────────────────── */}
      <aside className="hidden lg:flex w-60 bg-ink flex-col flex-none">
        <div className="px-5 py-5 border-b border-white/10">
          <BrandMark />
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="주 메뉴">
          <NavItems />
        </nav>
        <div className="px-3 py-4 border-t border-white/10">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 pl-4 pr-3 py-2.5 rounded-lg text-sm text-paper/55 hover:text-paper hover:bg-white/5 w-full transition-colors"
          >
            <FaSignOutAlt className="text-sm flex-none" aria-hidden /> 로그아웃
          </button>
        </div>
      </aside>

      {/* ── 모바일 상단바 ───────────────────────────────── */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-30 bg-ink safe-top px-4 pb-3 flex items-center justify-between">
        <BrandMark />
        <button
          onClick={() => setDrawerOpen(true)}
          aria-label="메뉴 열기"
          className="w-10 h-10 -mr-1.5 flex items-center justify-center rounded-lg text-paper/70 hover:text-paper hover:bg-white/10 transition-colors"
        >
          <FaBars className="text-lg" aria-hidden />
        </button>
      </header>

      {/* ── 모바일 드로어 ───────────────────────────────── */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label="메뉴">
          <div
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
            aria-hidden
          />
          <div className="absolute top-0 right-0 h-full w-72 max-w-[82%] bg-ink flex flex-col animate-fade-up safe-top">
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <BrandMark subtle />
              <button
                onClick={() => setDrawerOpen(false)}
                aria-label="메뉴 닫기"
                className="w-10 h-10 -mr-1.5 flex items-center justify-center rounded-lg text-paper/70 hover:text-paper hover:bg-white/10 transition-colors"
              >
                <FaTimes className="text-lg" aria-hidden />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="주 메뉴">
              <NavItems onNavigate={() => setDrawerOpen(false)} />
            </nav>
            <div className="px-3 py-4 border-t border-white/10 safe-bottom">
              <button
                onClick={handleSignOut}
                className="flex items-center gap-3 pl-4 pr-3 py-2.5 rounded-lg text-sm text-paper/55 hover:text-paper hover:bg-white/5 w-full transition-colors"
              >
                <FaSignOutAlt className="text-sm flex-none" aria-hidden /> 로그아웃
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 본문 ───────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto pt-16 lg:pt-0">
        <Outlet />
      </main>
    </div>
  );
}
