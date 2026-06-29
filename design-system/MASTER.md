# 케어로 디자인 시스템 — MASTER (곁/Care 아트 디렉션)

> 3개 앱(admin · franchisor · franchisee) 공통 단일 진실원천(SSOT).
> 목표: 실제 사용자가 봤을 때 **"사람이 의도를 가지고 만든 프리미엄 법률 케어 서비스"**로 읽히고, AI 생성물 특유의 무미건조함이 없을 것. 7개 평가 항목 전부 9.3/10 이상.

---

## 0. 한 문장 정의
**케어로**는 가맹점주가 법률 문제를 혼자 끌어안지 않도록 **곁에서 먼저 살피는** 화이트레이블 법률 케어 서비스다. 디자인은 "차가운 법무"가 아니라 "신뢰할 수 있는 곁"을 표현한다.

## 1. 아트 디렉션 핵심
- **정체성은 상수, 브랜드색은 액센트.** 아이보리·잉크·금색·명조 타이포가 정체성을 만든다. 테넌트 `--color-brand`는 CTA/포인트에만.
- **명조(세리프)는 절제해서 강하게.** 페이지당 1~2곳(헤드라인, 큰 숫자 옆 라벨 등)에만. 본문·UI는 전부 Pretendard.
- **여백이 곧 고급감.** 답답하게 채우지 말 것. 섹션 간 수직 리듬 16/24/32/48.
- **금색 헤어라인이 시그니처.** 제목 아래 짧은 금색 룰(`cl-rule-gold`) 또는 1px 라인으로 절제된 격식.
- **모션은 의미 있을 때만.** 진입 `fade-up`, 호버 미세 변화(150~220ms, ease-out). 장식적 애니메이션 금지.

## 2. 절대 금지 (AI 티 나는 것들)
- 보라/핑크 그라데이션, 네온, 글래스 남발, 이모지 아이콘.
- 의미 없는 `01/02/03` 번호 매기기(진짜 순서가 아닐 때).
- 회색-위-회색 저대비, 본문 12px 미만.
- 모든 카드에 동일한 큰 그림자(elevation 무분별). 그림자는 `shadow-card`/`shadow-lift`만.
- 가운데 정렬 히어로 + 큰 숫자 + 그라데이션 액센트의 "템플릿 답안".

---

## 3. 토큰 (Tailwind 프리셋에 이미 정의됨 — 이 이름만 사용)
**색**: `bg-paper`(#FBF8F2 바탕) · `bg-paper-raised`(#FFF 카드) · `bg-paper-sunken`(#F4EFE6) · `text-ink`(#1C1A17) · `text-ink-soft`(#57514A) · `text-ink-mute`(#8A8278) · `border-line`(#E8E1D4) · `border-line-strong` · `text-gold`/`bg-gold-soft` · `bg-brand`/`text-brand`(테넌트) · 시맨틱 `success/warn/danger`(+`-soft`).
**폰트**: `font-sans`(Pretendard 기본) · `font-display`/`font-serif`(Nanum Myeongjo).
**타입**: `text-2xs~text-4xl`(프리셋 스케일). 본문 `text-base`(15px/1.65). 숫자엔 `cl-num`.
**라운드**: `rounded-md`(10) 버튼 · `rounded-lg`(14) 카드 · `rounded-xl`(20) 큰 surface.
**그림자**: `shadow-card` 기본, `shadow-lift` 강조/호버, `shadow-pop` 모달.
**모션**: `animation-fade-up`, `ease-out`.

## 4. 컴포넌트 클래스 (theme.css — 새로 만들지 말고 이것 사용)
- 타이포: `.cl-display`(+`.cl-display-xl`), `.cl-eyebrow`(+`.cl-eyebrow-gold`), `.cl-num`
- 라인: `.cl-hairline`, `.cl-rule-gold`
- 카드: `.cl-card`, `.cl-card-flat`, `.cl-card-sunken`
- 버튼: `.cl-btn` + (`.cl-btn-primary`/`-secondary`/`-ghost`/`-gold`/`-danger`) + 크기(`.cl-btn-sm`/`-lg`/`-block`)
- 입력: `.cl-label`, `.cl-input`(textarea도 같은 클래스)
- 배지: `.cl-badge` + (`.cl-badge-neutral`/`-brand`/`-gold`/`-success`/`-warn`/`-danger`), 상태점 `.cl-dot`
- 스켈레톤: `.cl-skeleton`(로딩 시 회전 스피너 대신 권장)
- 링크: `.cl-link`

> 클래스로 부족한 미세 조정만 Tailwind 유틸로. 인라인 hex(`#C9A84C` 등) 사용 금지 — 토큰으로 대체.

## 5. 상태 색 매핑 (케이스/구독 등)
- open/active/활성 → `cl-badge-success` (점 `bg-success`)
- consulting/상담중/past_due → `cl-badge-warn`
- retained/수임 → `cl-badge-brand`
- closed/cancelled/비활성 → `cl-badge-neutral`
- 위험/만료임박 → `cl-badge-danger`
색만으로 의미 전달 금지 — 항상 한글 라벨 동반.

---

## 6. 패턴별 규칙

### 페이지 헤더(공통)
```
<eyebrow 작은 라벨>  예: "운영 콘솔"
<h1 .cl-display text-2xl/3xl>  페이지 제목(명조)
<금색 짧은 룰 cl-rule-gold 또는 한 줄 설명 text-ink-soft>
```
한 화면에 명조 헤드라인은 1개. 하위 섹션 제목은 Pretendard `font-semibold`.

### 데이터 테이블(어드민)
- 헤더: `text-2xs uppercase tracking-wide text-ink-mute`, 하단 `border-line`.
- 행: 호버 `hover:bg-paper-sunken`, 행 구분 `divide-line`. 숫자열 `cl-num text-right`.
- 모바일(<768): 테이블을 **카드 리스트로 전환**(각 행 = 카드). 절대 가로 스크롤 강요 금지.
- 정렬 가능 헤더엔 caret + `aria-sort`.

### 통계(스탯) 카드
큰 숫자는 `cl-num text-3xl font-semibold`(필요시 라벨만 명조). 추세/보조값은 `text-ink-soft text-sm`. 카드 = `cl-card p-5`. 그라데이션 액센트 금지.

### 빈 상태
아이콘(Phosphor/Heroicons, 라인) + 한 줄 제목(`font-semibold`) + 보조 설명(`text-ink-soft`) + 1개 기본 CTA. "초대장"처럼 행동을 권유.

### 로딩
`cl-skeleton`으로 실제 레이아웃 형태를 미리 보여줄 것(>300ms). 전체화면 스피너 지양.

### 폼
라벨 항상 표시(`cl-label`), placeholder는 예시만. 에러는 필드 **아래** `text-danger text-sm`, `role="alert"`. 제출 버튼 로딩 시 비활성+텍스트 변경. 비밀번호 show/hide 토글. 입력 `type=email/tel` 정확히.

### 모달/시트
배경 스크림 `bg-ink/40 backdrop-blur-sm`, 패널 `cl-card shadow-pop`, 진입 `animation-fade-up`. 닫기(X) 항상. 모바일은 하단 시트(아래서 슬라이드).

---

## 7. 앱별 적용 차이
- **admin (운영 콘솔)** · **franchisor (본사 콘솔)**: 데스크톱 우선이되 **모바일 완전 대응 필수**(사이드바 → 모바일 상단바+드로어/하단, 테이블→카드). 좌측 사이드바는 `bg-ink`(짙은 잉크) 위 아이보리 텍스트 + 활성 항목 금색 인디케이터. 밀도 높은 전문 도구 느낌(정밀).
- **franchisee (점주 PWA)**: 모바일 우선. 따뜻함 최대. 홈 히어로에 명조 헤드라인 + 금색 룰 + 안심 카피. 하단 탭 유지하되 토큰/타이포로 격상. 채팅은 말풍선·여백·타이포 다듬기. safe-area 준수. 브랜드색은 사용자 말풍선/CTA에만.

## 8. 카피(중요 — 톤이 AI 티를 좌우)
- 능동·평서, 사람 편에서. "제출"❌ → "상담 시작하기"⭕. 액션명은 흐름 내내 일관.
- 빈/에러 화면은 사과·모호 금지. 무엇이 일어났고 무엇을 하면 되는지.
- 점주 대상은 불안을 덜어주는 따뜻한 존댓말("혼자 고민하지 마세요"). 어드민은 간결·정확.
- 규제 업종: 과장·단정·승률 표현 금지. "일반 정보이며 법률 자문이 아님" 고지 유지.

## 9. 품질 기준(완료 정의)
- 접근성: 대비 4.5:1+, `:focus-visible` 링, 아이콘 버튼 `aria-label`, 색 단독 의존 금지, 시맨틱 태그(`nav/main/header`), 이미지 `alt`.
- 반응형: 375/768/1024 모두 깨짐 없음, 가로 스크롤 없음, 터치 타깃 44px+.
- 데이터 페칭 전부 `try/catch`(또는 `.catch`) — 실패 시 재시도 UI. **무한 로딩 금지**.
- `alert()` 제거 → 인라인/토스트.
- 빌드 통과(`npx pnpm --filter <app> build`), 타입 에러 0.
