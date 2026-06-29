// 운영 콘솔 셸 — 데스크톱 좌측 사이드바 + 모바일 상단바/드로어 레이아웃
import { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import {
  FaHome, FaBuilding, FaComments,
  FaCreditCard, FaCog, FaSignOutAlt, FaBalanceScale, FaBars, FaTimes,
} from 'react-icons/fa';

const NAV = [
  { icon: FaHome,       label: '대시보드',    path: '/'              },
  { icon: FaBuilding,   label: '브랜드 관리',  path: '/brands'        },
  { icon: FaComments,   label: '전체 케이스',  path: '/cases'         },
  { icon: FaCreditCard, label: '구독 관리',   path: '/subscriptions' },
  { icon: FaCog,        label: '시스템 설정',  path: '/settings'      },
];

function Brandmark() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid h-9 w-9 place-items-center rounded-md bg-white/5">
        <FaBalanceScale className="text-gold text-base" />
      </span>
      <div className="leading-tight">
        <p className="font-display text-[0.95rem] font-bold text-paper">케어로</p>
        <p className="text-2xs tracking-wide text-paper/45">운영 콘솔</p>
      </div>
    </div>
  );
}

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="주 메뉴" className="flex-1 space-y-1 px-3 py-4">
      {NAV.map(({ icon: Icon, label, path }) => (
        <NavLink
          key={path}
          to={path}
          end={path === '/'}
          onClick={onNavigate}
          className={({ isActive }) =>
            `relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors duration-150 ease-out ${
              isActive
                ? 'bg-white/[0.07] font-semibold text-paper'
                : 'text-paper/55 hover:bg-white/5 hover:text-paper'
            }`
          }
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-gold" aria-hidden />
              )}
              <Icon className={`flex-shrink-0 text-[0.95rem] ${isActive ? 'text-gold' : ''}`} aria-hidden />
              {label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

export default function AdminLayout() {
  const { signOut } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleSignOut = async () => { await signOut(); navigate('/login'); };

  const activeLabel = NAV.find(n => (n.path === '/' ? location.pathname === '/' : location.pathname.startsWith(n.path)))?.label ?? '운영 콘솔';

  return (
    <div className="flex h-screen bg-paper">
      {/* 데스크톱 사이드바 */}
      <aside className="hidden w-60 flex-shrink-0 flex-col bg-ink md:flex">
        <div className="border-b border-white/10 px-5 py-5">
          <Brandmark />
        </div>
        <NavItems />
        <div className="border-t border-white/10 px-3 py-4">
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm text-paper/55 transition-colors hover:bg-white/5 hover:text-paper"
          >
            <FaSignOutAlt className="text-[0.95rem]" aria-hidden /> 로그아웃
          </button>
        </div>
      </aside>

      {/* 모바일 드로어 */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            aria-label="메뉴 닫기"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-ink/50 backdrop-blur-sm"
          />
          <aside className="absolute left-0 top-0 flex h-full w-64 animate-fade-up flex-col bg-ink">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
              <Brandmark />
              <button
                aria-label="메뉴 닫기"
                onClick={() => setDrawerOpen(false)}
                className="grid h-9 w-9 place-items-center rounded-md text-paper/60 hover:bg-white/5 hover:text-paper"
              >
                <FaTimes />
              </button>
            </div>
            <NavItems onNavigate={() => setDrawerOpen(false)} />
            <div className="border-t border-white/10 px-3 py-4">
              <button
                onClick={handleSignOut}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm text-paper/55 transition-colors hover:bg-white/5 hover:text-paper"
              >
                <FaSignOutAlt className="text-[0.95rem]" aria-hidden /> 로그아웃
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* 본문 */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* 모바일 상단바 */}
        <header className="flex items-center gap-3 border-b border-line bg-paper-raised px-4 py-3 md:hidden">
          <button
            aria-label="메뉴 열기"
            onClick={() => setDrawerOpen(true)}
            className="grid h-10 w-10 place-items-center rounded-md text-ink-soft hover:bg-paper-sunken"
          >
            <FaBars />
          </button>
          <span className="font-display text-base font-bold text-ink">{activeLabel}</span>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden"><Outlet /></main>
      </div>
    </div>
  );
}
