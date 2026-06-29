import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, CASE_TYPE_LABELS, CASE_STATUS_LABELS } from '@care-law/shared';
import type { Case } from '@care-law/shared';
import { useAuthStore }  from '../store/authStore';
import { useBrandStore } from '../store/brandStore';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { FaPlus, FaArrowLeft, FaComments } from 'react-icons/fa';

// 상태 → 배지/점 색 (MASTER §5 매핑). 색 단독 의존 금지 → 항상 한글 라벨 동반.
const STATUS_STYLE: Record<string, { badge: string; dot: string }> = {
  open:       { badge: 'cl-badge-success', dot: 'bg-success' },
  consulting: { badge: 'cl-badge-warn',    dot: 'bg-warn'    },
  retained:   { badge: 'cl-badge-brand',   dot: 'bg-brand'   },
  closed:     { badge: 'cl-badge-neutral', dot: 'bg-ink-mute'},
};

export default function CasesPage() {
  const navigate        = useNavigate();
  const { user }        = useAuthStore();
  const { brand }       = useBrandStore();
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const brandColor = brand?.primary_color ?? '#1E2D4E';

  useEffect(() => {
    if (!user) return;
    supabase.from('carelaw_cases')
      .select('*')
      .eq('user_uid', user.uid)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setCases(data ?? []); setLoading(false); });
  }, [user]);

  return (
    <div className="flex flex-col min-h-screen bg-paper">
      <header className="bg-paper-raised border-b border-line safe-top">
        <div className="px-3 pb-3 pt-1 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <button onClick={() => navigate(-1)} aria-label="뒤로 가기"
                    className="w-10 h-10 flex items-center justify-center rounded-lg text-ink-soft hover:bg-paper-sunken transition-colors">
              <FaArrowLeft />
            </button>
            <div className="min-w-0">
              <p className="cl-eyebrow cl-eyebrow-gold">상담 기록</p>
              <h1 className="cl-display text-xl">내 케이스</h1>
            </div>
          </div>
          <button onClick={() => navigate('/chat')} className="cl-btn cl-btn-primary cl-btn-sm flex-shrink-0">
            <FaPlus className="text-xs" aria-hidden /> 새 상담
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 py-4 space-y-3 pb-24">
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map(i => (
              <div key={i} className="cl-card p-4">
                <div className="cl-skeleton h-4 w-2/3 mb-2.5" />
                <div className="cl-skeleton h-3 w-1/3 mb-3" />
                <div className="cl-skeleton h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : cases.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 gap-4 text-center">
            <div className="w-14 h-14 rounded-full bg-gold-soft flex items-center justify-center">
              <FaComments className="text-2xl text-gold" aria-hidden />
            </div>
            <div>
              <p className="cl-display text-lg">아직 시작한 상담이 없어요</p>
              <p className="text-ink-soft text-sm mt-1.5 leading-relaxed">
                작은 고민이라도 괜찮아요.<br />지금 편하게 첫 상담을 시작해 보세요.
              </p>
            </div>
            <button onClick={() => navigate('/chat')} className="cl-btn cl-btn-primary mt-1">
              상담 시작하기
            </button>
          </div>
        ) : cases.map(c => {
          const st = STATUS_STYLE[c.status] ?? STATUS_STYLE.closed;
          return (
            <button
              key={c.id}
              onClick={() => navigate(`/chat/${c.id}`)}
              className="cl-card w-full p-4 text-left active:translate-y-px transition-transform"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-ink text-base truncate">{c.title}</p>
                  <p className="text-ink-mute text-xs mt-0.5">{CASE_TYPE_LABELS[c.type]}</p>
                </div>
                <span className={`cl-badge ${st.badge} flex-shrink-0`}>
                  <span className={`cl-dot ${st.dot}`} aria-hidden />
                  {CASE_STATUS_LABELS[c.status]}
                </span>
              </div>
              <p className="text-ink-mute text-xs mt-2.5 cl-num">
                {format(parseISO(c.created_at), 'yyyy.MM.dd HH:mm', { locale: ko })}
              </p>
            </button>
          );
        })}
      </main>
    </div>
  );
}
