import { useEffect, useState } from 'react';
import { supabase } from '@care-law/shared';
import type { Notification } from '@care-law/shared';
import { useAuthStore } from '../store/authStore';
import { useBrandStore } from '../store/brandStore';
import { FaBell, FaArrowLeft } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;

  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return '방금 전';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}분 전`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}일 전`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}개월 전`;

  return `${Math.floor(months / 12)}년 전`;
}

export default function NotificationsPage() {
  const { user } = useAuthStore();
  const { brand } = useBrandStore();
  const navigate = useNavigate();
  const color = brand?.primary_color ?? '#1E2D4E';

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchNotifications();
  }, [user]);

  async function fetchNotifications() {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('carelaw_notifications')
      .select('*')
      .eq('target_uid', user.uid)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setNotifications(data as Notification[]);
    }
    setLoading(false);
  }

  async function markAsRead(id: string) {
    const { error } = await supabase
      .from('carelaw_notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('id', id);

    if (!error) {
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, read: true, read_at: new Date().toISOString() } : n,
        ),
      );
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <FaArrowLeft className="text-gray-600" />
        </button>
        <h1 className="text-lg font-bold text-gray-900">알림</h1>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-sm text-gray-400 animate-pulse">불러오는 중...</div>
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
            <FaBell className="text-2xl text-gray-300" />
          </div>
          <p className="text-gray-400 text-sm">알림이 없습니다</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => markAsRead(n.id)}
              className="w-full text-left px-4 py-3.5 flex gap-3 items-start hover:bg-gray-50 transition-colors"
              style={{
                backgroundColor: n.read ? undefined : `${color}08`,
              }}
            >
              {/* Unread indicator */}
              <div className="pt-1.5 shrink-0">
                {!n.read ? (
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                ) : (
                  <div className="w-2.5 h-2.5" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm leading-snug ${
                    n.read ? 'text-gray-600 font-normal' : 'text-gray-900 font-semibold'
                  }`}
                >
                  {n.title}
                </p>
                <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>
                <p className="text-xs text-gray-400 mt-1">{timeAgo(n.created_at)}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
