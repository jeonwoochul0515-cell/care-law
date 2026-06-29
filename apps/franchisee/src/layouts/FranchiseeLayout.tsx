import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { FaHome, FaComments, FaFolderOpen, FaUser, FaBell } from 'react-icons/fa';
import { useBrandStore } from '../store/brandStore';
import { useAuthStore } from '../store/authStore';
import { supabase } from '@care-law/shared';

const NAV = [
  { icon: FaHome,       label: '홈',    path: '/'       },
  { icon: FaComments,   label: '상담',  path: '/chat'   },
  { icon: FaFolderOpen, label: '케이스', path: '/cases'  },
  { icon: FaUser,       label: '내 정보', path: '/profile'},
];

export default function FranchiseeLayout() {
  const navigate     = useNavigate();
  const { pathname } = useLocation();
  const { brand }    = useBrandStore();
  const { user }     = useAuthStore();
  const color        = brand?.primary_color ?? '#1E2D4E';

  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    // Fetch initial unread count
    async function fetchUnreadCount() {
      const { count, error } = await supabase
        .from('carelaw_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('target_uid', user!.uid)
        .eq('read', false);

      if (!error && count !== null) {
        setUnreadCount(count);
      }
    }

    fetchUnreadCount();

    // Subscribe to realtime changes for notifications
    const channel = supabase
      .channel('notifications-unread')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'carelaw_notifications',
          filter: `target_uid=eq.${user.uid}`,
        },
        () => {
          // Refetch count on any change
          fetchUnreadCount();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <div className="flex flex-col h-screen bg-paper">
      {/* 상단 헤더 — 아이보리 바탕, 브랜드는 로고/이름에만 */}
      <header className="sticky top-0 z-50 bg-paper-raised border-b border-line safe-top">
        <div className="px-4 pb-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            {brand?.logo_url && (
              <img
                src={brand.logo_url}
                alt={brand.app_name}
                className="w-7 h-7 rounded-md object-contain"
              />
            )}
            <span className="text-base font-semibold tracking-tight truncate" style={{ color }}>
              {brand?.app_name ?? '케어로'}
            </span>
          </div>

          <button
            onClick={() => navigate('/notifications')}
            className="relative -mr-1 w-11 h-11 flex items-center justify-center rounded-lg text-ink-soft hover:bg-paper-sunken transition-colors"
            aria-label={unreadCount > 0 ? `알림 ${unreadCount}건` : '알림'}
          >
            <FaBell className="text-lg" />
            {unreadCount > 0 && (
              <span
                className="absolute top-1 right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-danger text-white text-[10px] font-bold px-1 cl-num"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* 본문 */}
      <main className="flex-1 overflow-y-auto pb-24">
        <Outlet />
      </main>

      {/* 하단 탭 — 활성 탭만 브랜드색 */}
      <nav className="fixed bottom-0 left-0 right-0 bg-paper-raised border-t border-line safe-bottom z-50" aria-label="주요 메뉴">
        <div className="flex px-1">
          {NAV.map(({ icon: Icon, label, path }) => {
            const active = path === '/' ? pathname === '/' : pathname.startsWith(path);
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                aria-current={active ? 'page' : undefined}
                className="flex-1 flex flex-col items-center pt-2 pb-1.5 gap-1 active:scale-95 transition-transform"
              >
                <Icon
                  className={`text-[1.35rem] transition-colors ${active ? '' : 'text-ink-mute'}`}
                  style={{ color: active ? color : undefined }}
                  aria-hidden
                />
                <span
                  className={`text-2xs font-semibold transition-colors ${active ? '' : 'text-ink-mute'}`}
                  style={{ color: active ? color : undefined }}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
