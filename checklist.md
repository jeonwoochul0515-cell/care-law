# 케어로 전면 리디자인 — 체크리스트

아트 디렉션: **곁(Care) — 따뜻한 신뢰** (웜 아이보리 · 잉크 · 금색 · 명조+Pretendard)
목표: 3개 앱 7개 항목 전부 9.3/10+, "AI 생성물" 느낌 제거.

## 기반 (공통) — ✅ 완료
- [x] 아트 디렉션 확정 (곁/Care)
- [x] 공유 Tailwind 프리셋 `packages/shared/tailwind-preset.js`
- [x] 공유 토큰·컴포넌트 CSS `packages/shared/src/theme.css`
- [x] 폰트 연결(Pretendard Variable + Nanum Myeongjo) — 3개 index.html
- [x] 3개 앱 tailwind.config / index.css 프리셋 연결
- [x] 디자인 스펙 `design-system/MASTER.md`
- [x] admin 기반 빌드 검증 통과

## admin (운영 콘솔) — ✅ 완료
- [x] AdminLayout(데스크톱 사이드바 + 모바일 드로어, 잉크+금색 인디케이터)
- [x] 전 페이지(Login/Dashboard/Brands/BrandDetail/Cases/CaseDetail/Subscriptions/Settings)
- [x] 데이터 페칭 try/catch + ErrorBox(무한 로딩 제거), alert/confirm 제거
- [x] 테이블→모바일 카드, 빈/로딩(skeleton)/에러 상태
- [x] 빌드 통과

## franchisor (본사 콘솔) — ✅ 완료
- [x] FranchisorLayout(모바일 드로어 대응)
- [x] 전 페이지(Login/Dashboard/Branding/Franchisees/Invite/Cases/Subscription)
- [x] 브랜드 저장 성공/실패 인라인 피드백, alert→모달/인라인
- [x] 빌드 통과

## franchisee (점주 PWA) — ✅ 완료
- [x] FranchiseeLayout(하단탭 격상, safe-area)
- [x] 전 페이지(Onboard/Home/Chat/Booking/Cases/Documents/Profile/Notifications/Locked)
- [x] 홈 히어로(명조+금색 룰+안심 카피), 채팅 말풍선 다듬기
- [x] 화이트레이블 유지(브랜드색 액센트만), 호맥 하드코딩 이미지 의존 제거
- [x] 빌드 통과(PWA SW/manifest 정상)

## 마무리
- [~] 3개 앱 전체 빌드(클린) — 진행 중
- [ ] (선택) 배포로 라이브 확인
- [ ] (선택) 미사용 homac-*.jpg 정리, 번들 code-split
