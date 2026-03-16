# 케어로 최초 설정 가이드
> 순서대로 따라하면 됩니다. Firebase Studio 기준.

---

## Step 1. Supabase 프로젝트 생성

1. https://supabase.com → 새 프로젝트 생성
2. 이름: `care-law` / 리전: **Northeast Asia (Seoul)**
3. 프로젝트 생성 완료 후 → **SQL Editor** 열기
4. `supabase/schema.sql` 전체 내용 복사 → 실행
5. **Settings → API** 에서 복사:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public` key → `VITE_SUPABASE_ANON_KEY`
   - `service_role secret` key → Firebase Functions 환경변수용 (절대 클라이언트 노출 금지)

```bash
# Supabase 타입 자동 생성 (스키마 변경 시마다 실행)
npx supabase gen types typescript --project-id YOUR_PROJECT_ID \
  > packages/shared/src/database.types.ts
```

---

## Step 2. Firebase 프로젝트 생성

1. https://console.firebase.google.com → 프로젝트 추가
2. 이름: `care-law` / Google Analytics: 선택 안 함
3. **Authentication → 시작하기**
   - 이메일/비밀번호 활성화 (어드민·본사·점주 모두 동일)

---

## Step 3. 환경변수 설정

각 앱 폴더에 `.env.local` 파일 생성:

```bash
# apps/admin/.env.local
# apps/franchisor/.env.local
# apps/franchisee/.env.local
# (3개 모두 동일한 내용)

VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=care-law.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=care-law
VITE_FIREBASE_APP_ID=1:xxx:web:xxx

VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

```bash
# firebase/functions/.env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...  ← service_role (절대 클라이언트 노출 금지)
CLAUDE_API_KEY=sk-ant-...
```

또는 Firebase Secret Manager 사용 (권장):
```bash
firebase functions:secrets:set SUPABASE_URL
firebase functions:secrets:set SUPABASE_SERVICE_ROLE_KEY
firebase functions:secrets:set CLAUDE_API_KEY
```

---

## Step 5. Firebase Hosting 타겟 설정

```bash
npm install -g firebase-tools
firebase login
firebase use --add  # care-law 선택

firebase target:apply hosting admin       care-law-admin
firebase target:apply hosting franchisor  care-law-franchisor
firebase target:apply hosting franchisee  care-law-franchisee
```

---

## Step 6. 개발 서버 실행

```bash
pnpm install          # 루트에서 한 번만

pnpm dev:admin        # http://localhost:5173
pnpm dev:franchisor   # http://localhost:5174
pnpm dev:franchisee   # http://localhost:5175?brand=test
```

---

## Step 7. 첫 번째 어드민 계정 설정

1. Firebase Console → Authentication → 사용자 추가
   - 이메일: `woochul@care-law.kr`
   - 비밀번호: 설정

2. UID 복사 후 Custom Claims 설정 (Firebase Cloud Shell 또는 로컬):
```javascript
// Firebase Admin SDK 스크립트
const admin = require('firebase-admin');
admin.initializeApp();
admin.auth().setCustomUserClaims('복사한_UID', { role: 'admin' })
  .then(() => console.log('어드민 설정 완료'));
```

---

## Step 8. 첫 번째 테스트 브랜드 등록

Supabase Table Editor → `brands` → Insert:
```json
{
  "name": "테스트 브랜드",
  "app_name": "테스트 법률케어",
  "subdomain": "test",
  "primary_color": "#1E2D4E",
  "plan": "free",
  "active": true,
  "owner_email": "test@test.com",
  "owner_uid": "임시값"
}
```

→ `http://localhost:5175?brand=test` 접속 확인

---

## Step 9. Functions 배포

```bash
cd firebase/functions
pnpm install
pnpm build

# 루트에서
firebase deploy --only functions
```

---

## Step 10. 도메인 연결 (care-law.kr)

1. 가비아/카페24에서 도메인 구매
2. Firebase Console → Hosting → 커스텀 도메인:
   - `admin.care-law.kr` → admin 타겟
   - `franchisor.care-law.kr` → franchisor 타겟
   - `*.care-law.kr` → franchisee 타겟 (와일드카드 SSL)
3. DNS TXT 레코드 인증 → SSL 자동 발급

---

## 전체 배포

```bash
# 모든 앱 빌드
pnpm build:all

# Firebase 전체 배포
firebase deploy
```

---

*작성: 전우철 | jeonwoochul0515@gmail.com | 법률사무소 청송*
