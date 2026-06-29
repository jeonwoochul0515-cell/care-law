// 케어로 디자인 시스템 — 3개 앱 공통 Tailwind 프리셋 (곁/Care 아트 디렉션)
// 정체성(아이보리·잉크·금색·타이포)은 상수, 브랜드색만 테넌트 주입 변수.

/** @type {import('tailwindcss').Config} */
export default {
  theme: {
    extend: {
      colors: {
        // 테넌트/앱별 주입 (런타임). 기본값 = 청송 네이비
        brand: 'var(--color-brand, #1E2D4E)',
        'brand-tint': 'var(--color-brand-tint, #EEF1F6)',

        // 상수 팔레트 — 웜 아이보리 / 잉크 / 금색
        paper: '#FBF8F2',
        'paper-raised': '#FFFFFF',
        'paper-sunken': '#F4EFE6',
        ink: '#1C1A17',
        'ink-soft': '#57514A',
        'ink-mute': '#8A8278',
        line: '#E8E1D4',
        'line-strong': '#D9CFBC',
        gold: '#B08A3E',
        'gold-soft': '#F2E8D2',

        // 시맨틱
        success: '#2E6F4E',
        'success-soft': '#E4EFE7',
        warn: '#B5701B',
        'warn-soft': '#F6EAD6',
        danger: '#B23A2E',
        'danger-soft': '#F4E2DE',
      },
      fontFamily: {
        sans: ['"Pretendard Variable"', 'Pretendard', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['"Nanum Myeongjo"', 'serif'],
        display: ['"Nanum Myeongjo"', 'serif'],
      },
      fontSize: {
        // 절제된 타입 스케일
        '2xs': ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.02em' }],
        xs: ['0.75rem', { lineHeight: '1.1rem' }],
        sm: ['0.8125rem', { lineHeight: '1.35rem' }],
        base: ['0.9375rem', { lineHeight: '1.65rem' }],
        lg: ['1.0625rem', { lineHeight: '1.6rem' }],
        xl: ['1.3125rem', { lineHeight: '1.7rem' }],
        '2xl': ['1.625rem', { lineHeight: '1.25' }],
        '3xl': ['2.125rem', { lineHeight: '1.18' }],
        '4xl': ['2.875rem', { lineHeight: '1.08' }],
      },
      borderRadius: {
        sm: '0.375rem',
        DEFAULT: '0.5rem',
        md: '0.625rem',
        lg: '0.875rem',
        xl: '1.25rem',
        '2xl': '1.625rem',
      },
      boxShadow: {
        // 웜톤 그림자 — 회색이 아닌 잉크 베이스
        card: '0 1px 2px rgba(28,26,23,0.04), 0 4px 16px -8px rgba(28,26,23,0.10)',
        lift: '0 2px 6px rgba(28,26,23,0.06), 0 12px 32px -12px rgba(28,26,23,0.16)',
        pop: '0 8px 40px -8px rgba(28,26,23,0.24)',
        ring: '0 0 0 3px var(--color-brand-ring, rgba(30,45,78,0.18))',
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'dot-bounce': {
          '0%,80%,100%': { transform: 'translateY(0)', opacity: '0.4' },
          '40%': { transform: 'translateY(-4px)', opacity: '1' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.4s cubic-bezier(0.22,1,0.36,1) both',
        'dot-bounce': 'dot-bounce 1.2s infinite ease-in-out',
      },
    },
  },
};
