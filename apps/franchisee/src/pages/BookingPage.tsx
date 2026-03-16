import { useNavigate } from 'react-router-dom';
import { useBrandStore } from '../store/brandStore';
import { FaArrowLeft, FaCalendarAlt, FaPhone, FaVideo, FaExternalLinkAlt, FaBalanceScale } from 'react-icons/fa';

/* ── 기본값 (케어로 제휴 법률사무소 청송) ── */
const DEFAULT_PHONE        = '1660-4452';
const DEFAULT_PHONE_RAW    = '16604452';
const DEFAULT_BOOKING_URL  = 'https://booking.naver.com/booking/13/bizes';
const DEFAULT_LAWYER_NAME  = '김창희 변호사';
const DEFAULT_FIRM_NAME    = '법률사무소 청송';
const DEFAULT_CREDENTIALS  = '변호사 + 가맹거래사 · 경력 10년+';

export default function BookingPage() {
  const navigate   = useNavigate();
  const { brand }  = useBrandStore();
  const brandColor = brand?.primary_color ?? '#1E2D4E';
  const brandName  = brand?.app_name ?? '케어로';
  const logoUrl    = brand?.logo_url;

  /* 현재는 모든 브랜드가 동일 법률사무소 사용 — 향후 브랜드별 설정 확장 가능 */
  const phone       = DEFAULT_PHONE;
  const phoneRaw    = DEFAULT_PHONE_RAW;
  const bookingUrl  = DEFAULT_BOOKING_URL;
  const lawyerName  = DEFAULT_LAWYER_NAME;
  const firmName    = DEFAULT_FIRM_NAME;
  const credentials = DEFAULT_CREDENTIALS;

  const bookingOptions = [
    {
      icon:   FaCalendarAlt,
      title:  '온라인 예약',
      sub:    '네이버 예약으로 시간 선택',
      action: () => window.open(bookingUrl, '_blank'),
      cta:    '예약하기',
    },
    {
      icon:   FaPhone,
      title:  '전화 상담',
      sub:    `${phone} · 평일 09:00~18:00`,
      action: () => { window.location.href = `tel:${phoneRaw}`; },
      cta:    '전화하기',
    },
    {
      icon:   FaVideo,
      title:  '화상 상담',
      sub:    '예약 후 Zoom 링크 발송',
      action: () => window.open(bookingUrl, '_blank'),
      cta:    '예약하기',
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* ── 헤더 ── */}
      <header className="text-white px-4 pt-12 pb-5 safe-top" style={{ background: brandColor }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2">
            <FaArrowLeft className="text-white/80" />
          </button>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {logoUrl ? (
              <img src={logoUrl} alt={brandName} className="w-8 h-8 rounded-lg object-contain bg-white/20 flex-shrink-0" />
            ) : null}
            <div className="min-w-0">
              <h1 className="font-bold text-lg truncate">{brandName} 변호사 상담</h1>
              <p className="text-white/60 text-xs">케어로 제휴 법률사무소</p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-5 space-y-4">
        {/* ── 제휴 법률사무소 소개 카드 ── */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${brandColor}15` }}
            >
              <FaBalanceScale style={{ color: brandColor }} className="text-2xl" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-gray-900">{lawyerName}</p>
              <p className="text-gray-500 text-xs mt-0.5">{firmName} 대표변호사</p>
              <p className="text-gray-400 text-xs mt-0.5">{credentials}</p>
            </div>
          </div>
          <div
            className="mt-3 px-3 py-2 rounded-xl text-xs"
            style={{ background: `${brandColor}08` }}
          >
            <span className="font-semibold" style={{ color: brandColor }}>케어로 제휴</span>
            <span className="text-gray-500 ml-1">
              — {brandName} 가맹점주 전용 법률 상담 서비스
            </span>
          </div>
        </div>

        {/* ── 예약 방법 ── */}
        <p className="text-gray-500 text-xs font-semibold tracking-wider">예약 방법 선택</p>
        {bookingOptions.map(({ icon: Icon, title, sub, action, cta }) => (
          <button
            key={title}
            onClick={action}
            className="w-full bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-4 active:scale-[0.98] transition-transform text-left"
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${brandColor}15` }}
            >
              <Icon style={{ color: brandColor }} className="text-xl" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 text-sm">{title}</p>
              <p className="text-gray-400 text-xs mt-0.5">{sub}</p>
            </div>
            <div
              className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full flex-shrink-0"
              style={{ background: `${brandColor}15`, color: brandColor }}
            >
              {cta} <FaExternalLinkAlt className="text-[10px]" />
            </div>
          </button>
        ))}

        {/* ── 안내 ── */}
        <div className="rounded-2xl p-4 border" style={{ background: `${brandColor}08`, borderColor: `${brandColor}20` }}>
          <p className="text-xs font-bold mb-2" style={{ color: brandColor }}>
            상담 전 준비사항
          </p>
          {[
            '관련 계약서나 서류가 있으면 미리 준비해주세요',
            '상황을 간략히 정리해두면 상담 시간이 절약됩니다',
            'AI 상담 내역이 있으면 변호사가 참고합니다',
          ].map((t, i) => (
            <p key={i} className="text-xs mt-1.5" style={{ color: `${brandColor}CC` }}>
              • {t}
            </p>
          ))}
        </div>
      </main>
    </div>
  );
}
