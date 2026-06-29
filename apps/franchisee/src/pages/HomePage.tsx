import { useNavigate }  from 'react-router-dom';
import { useBrandStore } from '../store/brandStore';
import { useAuthStore }  from '../store/authStore';
import {
  FaComments, FaCalendarAlt, FaGavel, FaShieldAlt,
  FaHandshake, FaFolderOpen, FaPhone, FaArrowRight,
} from 'react-icons/fa';

const MENUS = [
  { icon: FaComments,    label: 'AI 법률상담',  sub: '24시간 즉시 상담',    path: '/chat',                accent: true  },
  { icon: FaCalendarAlt, label: '상담 예약',    sub: '변호사 1:1 연결',     path: '/booking',             accent: false },
  { icon: FaGavel,       label: '형사 사건',    sub: '고소·고발 대응',      path: '/chat?type=criminal',  accent: false },
  { icon: FaShieldAlt,   label: '민사 사건',    sub: '계약·손해배상',       path: '/chat?type=civil',     accent: false },
  { icon: FaHandshake,   label: '가맹 분쟁',    sub: '계약·해지 분쟁',      path: '/chat?type=franchise', accent: false },
  { icon: FaFolderOpen,  label: '문서 관리',    sub: 'AI 문서 분석',        path: '/documents',           accent: false },
];

export default function HomePage() {
  const navigate              = useNavigate();
  const { brand }             = useBrandStore();
  const { user, franchisee }  = useAuthStore();
  const displayName           = franchisee?.name ?? user?.displayName?.split(' ')[0] ?? '점주';
  const brandColor            = brand?.primary_color ?? '#1B5E3B';

  return (
    <div className="flex flex-col min-h-screen bg-stone-50">

      {/* ── 히어로 배너 ── */}
      <div className="relative overflow-hidden">
        <img
          src="/homac-food.jpg"
          alt=""
          className="w-full h-52 object-cover"
        />
        {/* 반투명 그라데이션 오버레이 */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/50 to-stone-50" />

        {/* 배너 텍스트 */}
        <div className="absolute inset-0 flex flex-col justify-end px-5 pb-5">
          <p className="text-white/80 text-sm font-medium">안녕하세요,</p>
          <p className="text-white font-bold text-xl drop-shadow-md">
            {displayName} 점주님
          </p>
        </div>
      </div>

      {/* ── 빠른 상담 CTA ── */}
      <div className="px-4 -mt-3 relative z-10">
        <button
          onClick={() => navigate('/chat')}
          className="w-full rounded-2xl px-5 py-4 flex items-center gap-3 shadow-lg active:scale-[0.97] transition-all"
          style={{ background: `linear-gradient(135deg, ${brandColor}, ${brandColor}dd)` }}
        >
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <FaComments className="text-amber-300 text-lg" />
          </div>
          <div className="text-left flex-1">
            <p className="text-white font-bold text-sm">법률 문제가 생기셨나요?</p>
            <p className="text-white/60 text-xs">AI 변호사가 24시간 대기 중입니다</p>
          </div>
          <FaArrowRight className="text-amber-300 text-sm flex-shrink-0" />
        </button>
      </div>

      {/* ── 서비스 메뉴 ── */}
      <main className="flex-1 px-4 pt-6 pb-24">
        <p className="text-stone-400 text-xs font-bold mb-3 tracking-widest uppercase">서비스 메뉴</p>
        <div className="grid grid-cols-2 gap-3">
          {MENUS.map(({ icon: Icon, label, sub, path, accent }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`relative rounded-2xl p-4 flex flex-col gap-2.5 text-left active:scale-[0.96] transition-all overflow-hidden ${
                accent
                  ? 'text-white shadow-md'
                  : 'bg-white text-stone-800 border border-stone-100 shadow-sm hover:shadow-md'
              }`}
              style={accent ? { background: `linear-gradient(135deg, ${brandColor}, ${brandColor}cc)` } : undefined}
            >
              {/* 강조 타일 배경 장식 */}
              {accent && (
                <div className="absolute -right-3 -bottom-3 w-20 h-20 rounded-full bg-white/5" />
              )}
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                accent ? 'bg-white/15' : 'bg-stone-50'
              }`}>
                <Icon className="text-lg" style={{ color: accent ? '#fbbf24' : brandColor }} />
              </div>
              <div>
                <p className={`font-bold text-sm ${accent ? 'text-white' : 'text-stone-800'}`}>{label}</p>
                <p className={`text-[11px] mt-0.5 ${accent ? 'text-white/60' : 'text-stone-400'}`}>{sub}</p>
              </div>
            </button>
          ))}
        </div>

        {/* ── 매장 이미지 배너 ── */}
        <div className="mt-5 relative rounded-2xl overflow-hidden shadow-md">
          <img
            src="/homac-store.jpg"
            alt="호맥생활 매장"
            className="w-full h-32 object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
          <div className="absolute inset-0 flex flex-col justify-center px-5">
            <p className="text-amber-300 text-[10px] font-bold tracking-widest uppercase">HOMAC</p>
            <p className="text-white font-bold text-base mt-0.5">호맥생활과 함께하는</p>
            <p className="text-white/70 text-xs">안심 법률 케어 서비스</p>
          </div>
        </div>

        {/* ── 긴급 전화 ── */}
        <button
          onClick={() => window.location.href = 'tel:16604452'}
          className="mt-4 w-full bg-white border border-stone-100 rounded-2xl px-4 py-3.5 flex items-center gap-3 shadow-sm active:scale-[0.97] transition-all hover:shadow-md"
        >
          <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-red-50">
            <FaPhone className="text-red-500 text-sm" />
          </div>
          <div className="text-left flex-1">
            <p className="font-bold text-sm text-stone-800">긴급 전화 상담</p>
            <p className="text-xs text-stone-400">1660-4452 · 법률사무소 청송</p>
          </div>
          <span className="text-stone-300 text-lg">›</span>
        </button>
      </main>
    </div>
  );
}
