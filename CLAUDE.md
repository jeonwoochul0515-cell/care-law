# 케어로 (Care-Law) — Firebase Studio 프로젝트 지침서

> **이 파일을 먼저 읽으세요.** Claude Code / Firebase Studio에서 이 파일 기준으로 개발합니다.

---

## ✅ 확정 스택

| 역할 | 기술 | 비고 |
|------|------|------|
| 프론트엔드 | React 18 + Vite + TypeScript | 3개 앱 |
| 인증 | Firebase Auth | 이메일+패스워드 |
| 데이터베이스 | **Supabase (PostgreSQL)** | Firestore 아님 |
| 서버 로직 | Firebase Functions (Node 20) | Claude API, 권한 제어 |
| 스토리지 | Supabase Storage | 로고, 문서 파일 |
| 배포 | Firebase Hosting | 3개 타겟 |
| 상태관리 | Zustand | |
| 스타일 | Tailwind CSS | |

---

## 프로젝트 구조

```
care-law/
├── apps/
│   ├── admin/          ← 청송 운영자 전용  (admin.care-law.kr)       :5173
│   ├── franchisor/     ← 가맹본사 어드민   (franchisor.care-law.kr)  :5174
│   └── franchisee/     ← 점주 PWA         (kyochon.care-law.kr 등)  :5175
├── packages/
│   └── shared/src/
│       ├── index.ts         ← Firebase Auth + Supabase 클라이언트 + 공통 타입
│       └── database.types.ts ← Supabase 자동생성 타입
├── firebase/
│   └── functions/src/index.ts  ← 모든 서버 로직 (Supabase service_role 사용)
├── supabase/
│   └── schema.sql       ← PostgreSQL 스키마 + RLS
├── CLAUDE.md            ← 이 파일
├── SETUP.md             ← 최초 설정 가이드
├── firebase.json
├── pnpm-workspace.yaml
└── .env.example
```

---

## 인증 흐름 (핵심)

```
점주:
  이메일+패스워드 (Firebase Auth)
  → verifyInviteAndSetClaims Function 호출
  → Firebase Custom Claims 설정: { role: 'franchisee', brand_id, active: true }
  → Supabase franchisees 테이블에 레코드 생성
  → 이후 Supabase 쿼리 시 uid로 필터링

본사/어드민:
  이메일+패스워드 (Firebase Auth)
  → Custom Claims: { role: 'franchisor', brand_id } 또는 { role: 'admin' }
```

---

## Supabase 테이블 구조

```sql
brands          -- 가맹본사 브랜드 (subdomain, app_name, logo_url, primary_color, plan)
franchisees     -- 점주 (uid=Firebase UID, brand_id, active, contract_expiry)
invites         -- 초대 토큰 (token, brand_id, expires_at, used_at)
cases           -- 법률 케이스 (user_uid, brand_id, type, status)
messages        -- 채팅 메시지 (case_id, role, content)
subscriptions   -- 구독 정보 (brand_id, plan, amount, memo)
notifications   -- 알림 (target_uid, title, body, read)
```

---

## 클라이언트 vs Functions 데이터 접근

| 작업 | 방법 |
|------|------|
| 브랜드 정보 읽기 | 클라이언트 → Supabase anon key + RLS |
| 메시지 읽기 (실시간) | 클라이언트 → Supabase Realtime |
| 메시지 쓰기 (AI) | Functions → Supabase service_role |
| 점주 활성/비활성 | Functions → Firebase Admin + Supabase service_role |
| 초대 토큰 생성/검증 | Functions → Supabase service_role |
| 구독 관리 | Admin 앱 → Functions → Supabase service_role |

**규칙: 민감한 쓰기는 항상 Functions 통해서. 클라이언트는 읽기 위주.**

---

## 화이트레이블 동작

```
kyochon.care-law.kr 접속
→ brandStore.ts: 서브도메인 "kyochon" 추출
→ supabase.from('brands').eq('subdomain', 'kyochon') 쿼리
→ app_name, logo_url, primary_color 로드
→ document.title = "교촌 법률케어"
→ CSS var(--color-brand) = "#C9A84C" 주입
→ PWA manifest 동적 업데이트

개발 시: localhost:5175?brand=kyochon
```

---

## 구독 플랜

| 플랜 | 점주 한도 | 월 요금 |
|------|---------|---------|
| free | 10 | 0원 (무제한 기간) |
| starter | 30 | 99,000원 |
| growth | 100 | 249,000원 |
| enterprise | 999 | 490,000원~ |

초기: **수동 청구** (토스페이먼츠 연동은 2차)

---

## Firebase Functions 목록

| 함수 | 역할 |
|------|------|
| chatWithAI | Claude API 호출, 메시지 저장 |
| createInviteLink | 초대 링크 생성 (7일 유효) |
| verifyInviteAndSetClaims | 토큰 검증 + Custom Claims + franchisees insert |
| deactivateFranchisee | 비활성화: Claims false + Supabase update |
| activateFranchisee | 활성화: Claims true + Supabase update |
| autoDeactivateExpired | 매일 09:00 KST, contract_expiry 지난 점주 자동 비활성화 |
| classifyCase | 첫 메시지 → AI 케이스 유형 분류 |

---

## 환경변수 (각 앱 .env.local)

```env
# Firebase
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_APP_ID=

# Supabase (클라이언트용 — anon key만)
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=
```

```env
# firebase/functions/.env (서버용 — 절대 클라이언트 노출 금지)
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
CLAUDE_API_KEY=
```

---

## 개발 서버

```bash
pnpm install           # 루트에서 한 번만
pnpm dev:admin         # localhost:5173
pnpm dev:franchisor    # localhost:5174
pnpm dev:franchisee    # localhost:5175?brand=test
```

---

## 코딩 규칙

- 컬럼명 `snake_case` (Supabase PostgreSQL 기본)
- 컴포넌트명 `PascalCase`
- 파일명 `PascalCase.tsx` (컴포넌트), `camelCase.ts` (유틸)
- Supabase 쿼리는 항상 `{ data, error }` 구조분해
- Firebase UID = Supabase `uid` 필드 (text)
- `brand_id` = Supabase UUID (brands.id)
- 날짜는 ISO 8601 문자열 (`timestamptz`)

---

## 미결 사항 (개발하면서 순서대로)

- [ ] Supabase 프로젝트 생성 + schema.sql 실행
- [ ] Firebase 프로젝트 생성
- [ ] 각 앱 .env.local 파일 작성
- [ ] Functions secrets 설정 (SUPABASE_SERVICE_ROLE_KEY, CLAUDE_API_KEY)
- [ ] care-law.kr 도메인 구매 + Firebase Hosting 연결
- [ ] 첫 번째 어드민 계정 Custom Claims 수동 설정
- [ ] 변호사 예약 방식 확정 (네이버 예약 vs 자체)
- [ ] Supabase types 자동 생성 (`npx supabase gen types typescript`)

---

*업데이트: 2026-03-15 | 전우철 | jeonwoochul0515@gmail.com*
