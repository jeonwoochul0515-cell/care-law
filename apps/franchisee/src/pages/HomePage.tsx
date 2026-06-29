// 점주 홈 — 안심 카피 히어로 + 서비스 메뉴 + 긴급 전화 (곁/Care 아트 디렉션)
import { useNavigate }  from 'react-router-dom';
import { useBrandStore } from '../store/brandStore';
import { useAuthStore }  from '../store/authStore';
import {
  FaComments, FaCalendarAlt, FaGavel, FaShieldAlt,
  FaHandshake, FaFolderOpen, FaPhone, FaArrowRight,
} from 'react-icons/fa';

const MENUS = [
  { icon: FaComments,    label: 'AI 법률 상담', sub: '24시간 바로 여쭤보기', path: '/chat'                 },
  { icon: FaCalendarAlt, label: '변호사 예약',  sub: '1:1 상담 잡기',        path: '/booking'              },
  { icon: FaGavel,       label: '형사 사건',    sub: '고소·고발 대응',       path: '/chat?type=criminal'   },
  { icon: FaShieldAlt,   label: '민사 사건',    sub: '계약·손해배상',        path: '/chat?type=civil'      },
  { icon: FaHandshake,   label: '가맹 분쟁',    sub: '계약·해지 문제',       path: '/chat?type=franchise'  },
  { icon: FaFolderOpen,  label: '문서 관리',    sub: '계약서 AI 분석',       path: '/documents'            },
];

export default function HomePage() {
  const navigate              = useNavigate();
  const { brand }             = useBrandStore();
  const { user, franchisee }  = useAuthStore();
  const displayName           = franchisee?.name ?? user?.displayName?.split(' ')[0] ?? '점주';
  const brandColor            = brand?.primary_color ?? '#1E2D4E';

  return (
    <div className="flex flex-col min-h-full bg-paper">

      {/* ── 히어로: 명조 헤드라인 + 금색 룰 + 안심 카피 ── */}
      <section className="px-5 pt-7 pb-6 animation-fade-up">
        <p className="cl-eyebrow cl-eyebrow-gold">{brand?.app_name ?? '케어로'} 법률 케어</p>
        <p className="text-ink-soft text-sm mt-3">{displayName} 점주님, 안녕하세요.</p>
        <h1 className="cl-display text-3xl mt-1.5 leading-snug">
          계약서 한 줄도<br />혼자 고민하지 마세요
        </h1>
        <hr className="cl-rule-gold w-24 mt-4" />
        <p className="text-ink-soft text-base mt-4 leading-relaxed">
          가게를 지키다 마주치는 법률 문제, 처음부터 곁에서 함께 살펴 드릴게요.
        </p>
      </section>

      {/* ── 주요 CTA (브랜드색 액센트) ── */}
      <div className="px-5">
        <button
          onClick={() => navigate('/chat')}
          className="w-full rounded-xl px-5 py-4 flex items-center gap-3.5 text-left shadow-lift active:translate-y-px transition-transform"
          style={{ background: brandColor }}
        >
          <span className="w-11 h-11 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
            <FaComments className="text-gold text-lg" aria-hidden />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-white font-semibold text-base">지금 바로 상담 시작하기</span>
            <span className="block text-white/65 text-sm mt-0.5">AI 법률 도우미가 24시간 함께합니다</span>
          </span>
          <FaArrowRight className="text-gold text-sm flex-shrink-0" aria-hidden />
        </button>
      </div>

      {/* ── 서비스 메뉴 ── */}
      <div className="flex-1 px-5 pt-8 pb-6">
        <p className="cl-eyebrow mb-3">어떤 도움이 필요하신가요</p>
        <div className="grid grid-cols-2 gap-3">
          {MENUS.map(({ icon: Icon, label, sub, path }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="cl-card p-4 flex flex-col gap-3 text-left active:translate-y-px transition-transform"
            >
              <span
                className="w-11 h-11 rounded-lg flex items-center justify-center bg-paper-sunken"
              >
                <Icon className="text-lg" style={{ color: brandColor }} aria-hidden />
              </span>
              <span>
                <span className="block font-semibold text-ink text-sm">{label}</span>
                <span className="block text-ink-mute text-xs mt-0.5">{sub}</span>
              </span>
            </button>
          ))}
        </div>

        {/* ── 긴급 전화 ── */}
        <button
          onClick={() => { window.location.href = 'tel:16604452'; }}
          className="cl-card mt-4 w-full px-4 py-3.5 flex items-center gap-3.5 text-left active:translate-y-px transition-transform"
        >
          <span className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 bg-gold-soft">
            <FaPhone className="text-gold text-sm" aria-hidden />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block font-semibold text-sm text-ink">급하실 땐 전화로 바로</span>
            <span className="block text-xs text-ink-mute mt-0.5 cl-num">1660-4452 · 법률사무소 청송</span>
          </span>
          <FaArrowRight className="text-ink-mute text-xs flex-shrink-0" aria-hidden />
        </button>

        <p className="text-ink-mute text-xs leading-relaxed mt-5 px-1">
          이곳의 안내는 이해를 돕기 위한 일반 정보이며, 구체적인 법률 자문은 변호사 상담을 통해 확인해 주세요.
        </p>
      </div>
    </div>
  );
}
