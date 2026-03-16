import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, CASE_TYPE_LABELS, CASE_STATUS_LABELS } from '@care-law/shared';
import type { Case } from '@care-law/shared';
import { useAuthStore }  from '../store/authStore';
import { useBrandStore } from '../store/brandStore';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { FaPlus, FaArrowLeft, FaComments } from 'react-icons/fa';

const STATUS_COLOR: Record<string, string> = {
  open:       'bg-yellow-50 text-yellow-700',
  consulting: 'bg-blue-50 text-blue-700',
  retained:   'bg-purple-50 text-purple-700',
  closed:     'bg-gray-100 text-gray-500',
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
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="text-white px-4 pt-12 pb-4 safe-top" style={{ background: brandColor }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 -ml-2">
              <FaArrowLeft className="text-white/80" />
            </button>
            <h1 className="font-bold text-lg">내 케이스</h1>
          </div>
          <button onClick={() => navigate('/chat')}
                  className="flex items-center gap-1.5 bg-[#C9A84C] text-[#1E2D4E] text-xs font-bold px-3 py-2 rounded-full">
            <FaPlus className="text-xs" /> 새 상담
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 py-4 space-y-3 pb-24">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-4 rounded-full border-gray-200 border-t-gray-400 animate-spin" />
          </div>
        ) : cases.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <FaComments className="text-4xl text-gray-200" />
            <p className="text-gray-400 text-sm text-center">아직 상담 내역이 없습니다<br />법률 문제가 있으면 AI 상담을 시작해보세요</p>
            <button onClick={() => navigate('/chat')}
                    className="text-white text-sm font-bold px-5 py-3 rounded-2xl"
                    style={{ background: brandColor }}>
              AI 상담 시작하기
            </button>
          </div>
        ) : cases.map(c => (
          <button
            key={c.id}
            onClick={() => navigate(`/chat/${c.id}`)}
            className="w-full bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-left active:scale-[0.98] transition-transform"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 text-sm truncate">{c.title}</p>
                <p className="text-gray-400 text-xs mt-0.5">{CASE_TYPE_LABELS[c.type]}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ${STATUS_COLOR[c.status] ?? 'bg-gray-100 text-gray-500'}`}>
                {CASE_STATUS_LABELS[c.status]}
              </span>
            </div>
            <p className="text-gray-300 text-xs mt-2">
              {format(parseISO(c.created_at), 'yyyy.MM.dd HH:mm', { locale: ko })}
            </p>
          </button>
        ))}
      </main>
    </div>
  );
}
