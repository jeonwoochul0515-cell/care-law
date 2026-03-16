-- ================================================================
-- 케어로 (Care-Law) — Supabase PostgreSQL 스키마
-- Firebase Auth UID를 user_id로 사용
-- RLS: Firebase Functions에서 service_role key로 전부 처리
--      클라이언트에서는 anon key + RLS 정책 적용
-- ================================================================

-- ── 확장 ──────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── ENUM 타입 ─────────────────────────────────────────────────
create type plan_type as enum ('free', 'starter', 'growth', 'enterprise');
create type case_type as enum ('criminal', 'civil', 'franchise', 'labor', 'lease', 'other');
create type case_status as enum ('open', 'consulting', 'retained', 'closed');
create type message_role as enum ('user', 'assistant');
create type user_role as enum ('admin', 'franchisor', 'franchisee');

-- ================================================================
-- 브랜드 (가맹본사)
-- ================================================================
create table carelaw_brands (
  id              uuid primary key default uuid_generate_v4(),
  name            text not null,                    -- 법인명 "교촌에프앤비"
  app_name        text not null,                    -- 앱 표시명 "교촌 법률케어"
  subdomain       text not null unique,             -- "kyochon" → kyochon.care-law.kr
  logo_url        text,
  primary_color   text not null default '#1E2D4E',
  plan            plan_type not null default 'free',
  active          boolean not null default true,
  owner_email     text not null,
  owner_uid       text not null unique,             -- Firebase Auth UID (본사 계정)
  plan_expiry     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ================================================================
-- 점주
-- ================================================================
create table carelaw_franchisees (
  id                uuid primary key default uuid_generate_v4(),
  uid               text not null unique,           -- Firebase Auth UID
  brand_id          uuid not null references carelaw_brands(id) on delete cascade,
  name              text,
  phone             text,
  store_name        text,
  store_address     text,
  contract_expiry   timestamptz,
  active            boolean not null default true,  -- false → PWA 잠금
  invite_token      text,
  invited_at        timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index idx_carelaw_franchisees_brand_id on carelaw_franchisees(brand_id);
create index idx_carelaw_franchisees_uid on carelaw_franchisees(uid);

-- ================================================================
-- 초대 토큰
-- ================================================================
create table carelaw_invites (
  token       text primary key,                     -- 랜덤 토큰
  brand_id    uuid not null references carelaw_brands(id) on delete cascade,
  created_by  text not null,                        -- franchisor Firebase UID
  used_at     timestamptz,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);
create index idx_carelaw_invites_brand_id on carelaw_invites(brand_id);

-- ================================================================
-- 케이스 (법률 상담 건)
-- ================================================================
create table carelaw_cases (
  id           uuid primary key default uuid_generate_v4(),
  user_uid     text not null,                       -- 점주 Firebase UID
  brand_id     uuid not null references carelaw_brands(id) on delete cascade,
  type         case_type not null default 'other',
  status       case_status not null default 'open',
  title        text not null default '법률 상담',
  summary      text,                                -- AI 생성 요약 (본사 조회용)
  attachments  text[] default '{}',                -- Storage URLs
  retained_at  timestamptz,
  closed_at    timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index idx_carelaw_cases_user_uid on carelaw_cases(user_uid);
create index idx_carelaw_cases_brand_id on carelaw_cases(brand_id);
create index idx_carelaw_cases_status on carelaw_cases(status);

-- ================================================================
-- 채팅 메시지
-- ================================================================
create table carelaw_messages (
  id          uuid primary key default uuid_generate_v4(),
  case_id     uuid not null references carelaw_cases(id) on delete cascade,
  role        message_role not null,
  content     text not null,
  created_at  timestamptz not null default now()
);
create index idx_carelaw_messages_case_id on carelaw_messages(case_id);

-- ================================================================
-- 구독 (수동 청구 단계에서는 메모용)
-- ================================================================
create table carelaw_subscriptions (
  id              uuid primary key default uuid_generate_v4(),
  brand_id        uuid not null unique references carelaw_brands(id) on delete cascade,
  plan            plan_type not null default 'free',
  amount          integer not null default 0,       -- 원 단위
  status          text not null default 'active',   -- active | past_due | cancelled
  next_billing    date,
  memo            text,                             -- 수동 청구 시 메모
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ================================================================
-- 알림
-- ================================================================
create table carelaw_notifications (
  id          uuid primary key default uuid_generate_v4(),
  target_uid  text not null,                        -- Firebase UID
  title       text not null,
  body        text not null,
  type        text not null,                        -- case_new | case_update | system
  data        jsonb,
  read        boolean not null default false,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index idx_carelaw_notifications_target_uid on carelaw_notifications(target_uid);
create index idx_carelaw_notifications_read on carelaw_notifications(target_uid, read);

-- ================================================================
-- updated_at 자동 갱신 트리거
-- ================================================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_carelaw_brands_updated_at        before update on carelaw_brands        for each row execute function update_updated_at();
create trigger trg_carelaw_franchisees_updated_at   before update on carelaw_franchisees   for each row execute function update_updated_at();
create trigger trg_carelaw_cases_updated_at         before update on carelaw_cases         for each row execute function update_updated_at();
create trigger trg_carelaw_subscriptions_updated_at before update on carelaw_subscriptions for each row execute function update_updated_at();

-- ================================================================
-- RLS 정책
-- 클라이언트는 anon key 사용 → RLS 적용
-- Firebase Functions은 service_role key → RLS bypass
-- ================================================================

alter table carelaw_brands        enable row level security;
alter table carelaw_franchisees   enable row level security;
alter table carelaw_invites        enable row level security;
alter table carelaw_cases          enable row level security;
alter table carelaw_messages       enable row level security;
alter table carelaw_subscriptions  enable row level security;
alter table carelaw_notifications  enable row level security;

-- 브랜드: 서비스 롤만 전체 접근, 클라이언트는 읽기만
-- (실제 쓰기는 모두 Firebase Functions에서 service_role로 처리)
create policy "carelaw_brands_read_active"
  on carelaw_brands for select
  using (active = true);

-- 점주: 자신의 소속 브랜드 점주 목록 읽기
create policy "carelaw_franchisees_read_own"
  on carelaw_franchisees for select
  using (true); -- Functions에서 필터링

-- 케이스: anon key는 SELECT만 가능, 클라이언트 WHERE절로 필터링
-- 쓰기는 모두 Functions(service_role)에서 처리
create policy "carelaw_cases_read_own"
  on carelaw_cases for select
  using (true);

create policy "carelaw_cases_insert_own"
  on carelaw_cases for insert
  with check (true);

-- 메시지: 읽기 허용, 클라이언트에서 case_id로 필터링
create policy "carelaw_messages_read_own"
  on carelaw_messages for select
  using (true);

-- 알림: 읽기/읽음처리 허용, 클라이언트에서 target_uid로 필터링
create policy "carelaw_notifications_read_own"
  on carelaw_notifications for select
  using (true);

create policy "carelaw_notifications_update_own"
  on carelaw_notifications for update
  using (true);

-- ================================================================
-- 초기 플랜 상수 뷰 (참고용)
-- ================================================================
create view carelaw_plan_limits as
select 'free'::plan_type as plan, 10 as max_franchisees, 0 as price_krw
union all select 'starter', 30, 99000
union all select 'growth', 100, 249000
union all select 'enterprise', 999, 490000;
