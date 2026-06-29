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
    <div className="min-h-screen bg-paper">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-paper-raised border-b border-line safe-top">
        <div className="px-3 pb-3 pt-1 flex items-center gap-2">
          <button onClick={() => navigate(-1)} aria-label="뒤로 가기"
                  className="w-10 h-10 flex items-center justify-center rounded-lg text-ink-soft hover:bg-paper-sunken transition-colors">
            <FaArrowLeft />
          </button>
          <div>
            <p className="cl-eyebrow cl-eyebrow-gold">소식</p>
            <h1 className="cl-display text-xl">알림</h1>
          </div>
        </div>
      </header>

      {/* Content */}
      {loading ? (
        <div className="px-4 py-4 space-y-3">
          {[0, 1, 2].map(i => (
            <div key={i} className="cl-card p-4">
              <div className="cl-skeleton h-4 w-1/2 mb-2" />
              <div className="cl-skeleton h-3 w-3/4" />
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-6 gap-4 text-center">
          <div className="w-14 h-14 rounded-full bg-gold-soft flex items-center justify-center">
            <FaBell className="text-2xl text-gold" aria-hidden />
          </div>
          <div>
            <p className="cl-display text-lg">새로운 소식이 없어요</p>
            <p className="text-ink-soft text-sm mt-1.5">상담 진행과 안내를 이곳에서 알려 드릴게요.</p>
          </div>
        </div>
      ) : (
        <div className="divide-y divide-line">
          {notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => markAsRead(n.id)}
              className="w-full text-left px-4 py-4 flex gap-3 items-start hover:bg-paper-sunken transition-colors"
              style={{ backgroundColor: n.read ? undefined : `${color}0D` }}
            >
              {/* Unread indicator */}
              <div className="pt-1.5 shrink-0">
                {!n.read ? (
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} aria-label="읽지 않음" />
                ) : (
                  <div className="w-2.5 h-2.5" aria-hidden />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className={`text-base leading-snug ${n.read ? 'text-ink-soft font-normal' : 'text-ink font-semibold'}`}>
                  {n.title}
                </p>
                <p className="text-sm text-ink-soft mt-0.5 line-clamp-2">{n.body}</p>
                <p className="text-xs text-ink-mute mt-1.5">{timeAgo(n.created_at)}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
