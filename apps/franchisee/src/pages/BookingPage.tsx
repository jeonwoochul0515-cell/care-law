import { useNavigate } from 'react-router-dom';
import { useBrandStore } from '../store/brandStore';
import { FaArrowLeft, FaCalendarAlt, FaPhone, FaVideo, FaExternalLinkAlt } from 'react-icons/fa';

const BOOKING_OPTIONS = [
  {
    icon: FaCalendarAlt,
    title: '온라인 예약',
    sub:   '네이버 예약으로 시간 선택',
    action: () => window.open('https://booking.naver.com/booking/13/bizes', '_blank'),
    color: '#03C75A',
    cta: '예약하기',
  },
  {
    icon: FaPhone,
    title: '전화 상담',
    sub:   '1660-4452 · 평일 09:00~18:00',
    action: () => window.location.href = 'tel:16604452',
    color: '#1E2D4E',
    cta: '전화하기',
  },
  {
    icon: FaVideo,
    title: '화상 상담',
    sub:   '예약 후 Zoom 링크 발송',
    action: () => window.open('https://booking.naver.com', '_blank'),
    color: '#2D8CFF',
    cta: '예약하기',
  },
];

export default function BookingPage() {
  const navigate    = useNavigate();
  const { brand }   = useBrandStore();
  const brandColor  = brand?.primary_color ?? '#1E2D4E';

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="text-white px-4 pt-12 pb-4 safe-top" style={{ background: brandColor }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2">
            <FaArrowLeft className="text-white/80" />
          </button>
          <div>
            <h1 className="font-bold text-lg">변호사 상담 예약</h1>
            <p className="text-white/60 text-xs">법률사무소 청송 · 김창희 변호사</p>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-5 space-y-4">
        {/* 소개 카드 */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
               style={{ background: brandColor }}>
            <span className="text-[#C9A84C] font-bold text-2xl">김</span>
          </div>
          <div>
            <p className="font-bold text-gray-900">김창희 변호사</p>
            <p className="text-gray-500 text-xs mt-0.5">법률사무소 청송 대표변호사</p>
            <p className="text-gray-400 text-xs mt-0.5">변호사 + 가맹거래사 · 경력 10년+</p>
          </div>
        </div>

        {/* 예약 방법 */}
        <p className="text-gray-500 text-xs font-semibold tracking-wider">예약 방법 선택</p>
        {BOOKING_OPTIONS.map(({ icon: Icon, title, sub, action, color, cta }) => (
          <button
            key={title}
            onClick={action}
            className="w-full bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-4 active:scale-[0.98] transition-transform text-left"
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                 style={{ background: color + '15' }}>
              <Icon style={{ color }} className="text-xl" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-gray-900 text-sm">{title}</p>
              <p className="text-gray-400 text-xs mt-0.5">{sub}</p>
            </div>
            <div className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full"
                 style={{ background: color + '15', color }}>
              {cta} <FaExternalLinkAlt className="text-xs" />
            </div>
          </button>
        ))}

        {/* 안내 */}
        <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
          <p className="text-blue-800 text-xs font-bold mb-2">📋 상담 전 준비사항</p>
          {['관련 계약서나 서류가 있으면 미리 준비해주세요','상황을 간략히 정리해두면 상담 시간이 절약됩니다','AI 상담 내역이 있으면 변호사가 참고합니다'].map((t, i) => (
            <p key={i} className="text-blue-700 text-xs mt-1.5">• {t}</p>
          ))}
        </div>
      </main>
    </div>
  );
}
