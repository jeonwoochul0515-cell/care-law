# 케어로 리디자인 — 컨텍스트 노트 (결정과 이유)

## 아트 디렉션: 곁(Care)
- 사용자 선택. 후보는 곁(Care)/정밀(Precision)/법전(Codex) 3안.
- 이유: 점주(불안한 비전문가)가 핵심 사용자 → 따뜻함·신뢰가 전환과 만족을 좌우. 어드민도 같은 정체성으로 통일.

## 정체성=상수, 브랜드색=액센트 (핵심 구조 결정)
- franchisee는 가맹 브랜드가 `--color-brand`를 **런타임 주입**(화이트레이블). 따라서 단일 액센트 컬러에 정체성을 걸 수 없음.
- 해결: 아이보리·잉크·금색·명조 타이포를 **상수 토큰**으로 고정해 정체성을 만들고, 브랜드색은 CTA/포인트에만 사용. → 어떤 브랜드색이 들어와도 고급감 유지.

## 폰트
- 한글 필수 → 스킬 추천(EB Garamond/Lato)은 한글 미지원이라 폐기.
- Nanum Myeongjo(명조 디스플레이, Google Fonts) + Pretendard Variable(본문, jsDelivr CDN). 둘 다 index.html `<link>`로 로드(font-display swap, 성능 유리).

## 기술 구조
- 공유 프리셋 `packages/shared/tailwind-preset.js`(ESM) → 3개 앱 `presets:[preset]`.
- 공유 CSS `packages/shared/src/theme.css`(순수 CSS, @apply/@layer 미사용) → 각 앱 index.css 최상단 `@import` 후 @tailwind. import-순서 안전 확인.
- `packages/shared/package.json`에 `"type":"module"` 추가(프리셋 ESM 경고 제거).

## 빌드 환경 함정 (중요)
- `pnpm`은 PATH에 없음 → **반드시 `npx pnpm`** 사용. (스크립트도 `npx pnpm` 기반.)
- 설치 후 esbuild 빌드 스크립트가 ignored됨 → `npx pnpm rebuild esbuild` 필요(안 하면 vite build 실패).
- 빌드: `cd apps/<app> && npx vite build` 또는 `npx pnpm --filter <app> build`.

## 작업 분담
- 기반(토큰/폰트/스펙)은 메인 세션이 직접 구축(일관성). 페이지 리디자인은 app별 병렬 서브에이전트가 MASTER.md 준수해 수행.

## 보안 — 테넌트 격리 (방향 A: Firebase Third-Party Auth + RLS)
- 점검 결과: RLS는 켜졌으나 정책이 `using(true)`라 anon 키로 전 테넌트 case/message 열람 가능(CRITICAL). 인증 브리지 부재로 `auth.uid()` 미채움.
- 진행 순서(사용자 승인): **Part A(Supabase에 Firebase 공급자 등록) 먼저 → 활성 확인 후 Part B(클라이언트 토큰 전달) 배포**. A 라이브 전에 B 배포 시 401 위험.
- Part A: 사용자가 대시보드에서 직접 등록(projectId=`care-law`). 동기화용 `supabase/config.toml` 생성 완료. 사용자가 "A 켰다" 신호 주면 B 적용.
- Part B(대기 중): `packages/shared/src/index.ts` createClient에 `accessToken` 옵션 추가. getIdToken 실패 시 try/catch로 null 반환(anon 폴백, throw 금지).
- **[3단계 정책 교체 시 반드시 처리할 메모]** 로그인 전 접근하는 **공개 읽기 경로**는 별도 anon 정책 필요:
  - `carelaw_brands`: 서브도메인/brand 파라미터로 브랜드 해석(app_name/logo/color) — 비로그인 anon SELECT 허용 유지 필요(현재 `active=true` 정책). 단 owner_email/owner_uid 같은 PII는 공개 뷰로 분리 검토.
  - 온보딩(초대 토큰 검증)은 Functions 경유라 RLS 영향 적음 — 확인 필요.
  - 즉 "자기 brand_id/user_uid만" 정책으로 전부 잠그되, 브랜드 공개 조회만 anon 예외를 남길 것.
- 검증 항목: A/B 브랜드 교차 case/message 0건, 구독 페이지 정상 노출, /brands·/cases 로딩멈춤 해소, **Realtime 채팅 송수신**, Supabase Advisor CRITICAL 해소.

## 미해결/후속
- offline.html(franchisee) 내용 미완 — 여력 되면 케어 톤으로.
- 번들 564KB 경고(admin) — 추후 code-split 고려(이번 범위 아님).
- 다크모드: 이번 범위 제외(라이트 온리).
