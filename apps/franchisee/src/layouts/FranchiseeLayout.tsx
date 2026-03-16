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
    <div className="flex flex-col h-screen">
      {/* Top header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {brand?.logo_url && (
            <img
              src={brand.logo_url}
              alt={brand.app_name}
              className="w-7 h-7 rounded-md object-contain"
            />
          )}
          <span className="text-base font-bold" style={{ color }}>
            {brand?.app_name ?? '캐어로'}
          </span>
        </div>

        <button
          onClick={() => navigate('/notifications')}
          className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="알림"
        >
          <FaBell className="text-lg text-gray-600" />
          {unreadCount > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-white text-[10px] font-bold px-1"
              style={{ backgroundColor: '#EF4444' }}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </header>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </div>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 safe-bottom z-50">
        <div className="flex">
          {NAV.map(({ icon: Icon, label, path }) => {
            const active = path === '/' ? pathname === '/' : pathname.startsWith(path);
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className="flex-1 flex flex-col items-center py-2.5 gap-0.5 active:scale-90 transition-transform"
              >
                <Icon className="text-lg" style={{ color: active ? color : '#9CA3AF' }} />
                <span className="text-xs" style={{ color: active ? color : '#9CA3AF' }}>{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
