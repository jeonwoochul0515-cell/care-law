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
    <div className="flex flex-col min-h-screen bg-paper">
      {/* ── 헤더 ── */}
      <header className="bg-paper-raised border-b border-line safe-top">
        <div className="px-3 pb-3 pt-1 flex items-center gap-2">
          <button onClick={() => navigate(-1)} aria-label="뒤로 가기"
                  className="w-10 h-10 flex items-center justify-center rounded-lg text-ink-soft hover:bg-paper-sunken transition-colors">
            <FaArrowLeft />
          </button>
          <div className="min-w-0">
            <p className="cl-eyebrow cl-eyebrow-gold">변호사 상담</p>
            <h1 className="cl-display text-xl truncate">{brandName} 법률 상담</h1>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-5 space-y-4">
        {/* ── 제휴 법률사무소 소개 카드 ── */}
        <div className="cl-card p-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0 bg-gold-soft">
              <FaBalanceScale className="text-gold text-2xl" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="cl-display text-lg">{lawyerName}</p>
              <p className="text-ink-soft text-sm mt-0.5">{firmName} 대표변호사</p>
              <p className="text-ink-mute text-xs mt-0.5">{credentials}</p>
            </div>
          </div>
          <div className="mt-4 px-3.5 py-2.5 rounded-md bg-paper-sunken text-sm">
            <span className="cl-badge cl-badge-gold mr-1.5">케어로 제휴</span>
            <span className="text-ink-soft">{brandName} 가맹점주 전용 상담입니다.</span>
          </div>
        </div>

        {/* ── 예약 방법 ── */}
        <p className="cl-eyebrow px-1 pt-1">상담 방법 선택</p>
        <div className="space-y-3">
          {bookingOptions.map(({ icon: Icon, title, sub, action, cta }) => (
            <button
              key={title}
              onClick={action}
              className="cl-card w-full p-4 flex items-center gap-4 active:translate-y-px transition-transform text-left"
            >
              <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 bg-paper-sunken">
                <Icon style={{ color: brandColor }} className="text-xl" aria-hidden />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-ink text-sm">{title}</p>
                <p className="text-ink-mute text-xs mt-0.5">{sub}</p>
              </div>
              <span className="flex items-center gap-1 text-sm font-semibold flex-shrink-0" style={{ color: brandColor }}>
                {cta} <FaExternalLinkAlt className="text-[10px]" aria-hidden />
              </span>
            </button>
          ))}
        </div>

        {/* ── 안내 ── */}
        <div className="cl-card-sunken p-4">
          <p className="font-semibold text-sm mb-2.5 text-ink">상담 전 이것만 준비하면 충분해요</p>
          <ul className="space-y-1.5">
            {[
              '관련 계약서나 서류가 있으면 곁에 두세요',
              '상황을 한두 줄로 정리해 두면 상담이 빨라져요',
              'AI 상담 내역이 있으면 변호사가 미리 살펴봅니다',
            ].map((t, i) => (
              <li key={i} className="text-sm text-ink-soft flex gap-2">
                <span className="text-gold mt-px" aria-hidden>·</span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
}
