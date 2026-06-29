-- 롤백: 20260629_tenant_isolation_rls.sql 되돌리기 (원래 느슨한 상태로 복구)
-- 검증 실패 시 즉시 실행. 데이터 무변경.

begin;

-- 9. plan_limits invoker 해제(원래 정의자 동작)
alter view public.carelaw_plan_limits reset (security_invoker);

-- 3~8. 새 정책 제거
drop policy if exists "carelaw_brands_anon_public"        on public.carelaw_brands;
drop policy if exists "carelaw_brands_auth_select"        on public.carelaw_brands;
drop policy if exists "carelaw_cases_select"              on public.carelaw_cases;
drop policy if exists "carelaw_cases_insert"              on public.carelaw_cases;
drop policy if exists "carelaw_messages_select"           on public.carelaw_messages;
drop policy if exists "carelaw_franchisees_select"        on public.carelaw_franchisees;
drop policy if exists "carelaw_notifications_select"      on public.carelaw_notifications;
drop policy if exists "carelaw_notifications_update"      on public.carelaw_notifications;
drop policy if exists "carelaw_subscriptions_select"      on public.carelaw_subscriptions;

drop view if exists public.carelaw_public_brands;

-- 2~3. anon 권한 원복(원래 전체 select 가능 상태)
grant select on public.carelaw_brands         to anon;
grant select on public.carelaw_cases          to anon;
grant select on public.carelaw_messages        to anon;
grant select on public.carelaw_franchisees     to anon;
grant select on public.carelaw_subscriptions   to anon;
grant select on public.carelaw_notifications   to anon;
grant select on public.carelaw_invites         to anon;
grant insert, update on public.carelaw_cases         to anon;
grant update          on public.carelaw_notifications to anon;

-- 1. 원래 느슨한 정책 복구(schema.sql과 동일) — 선제 drop으로 재실행 안전
drop policy if exists "carelaw_brands_read_active"       on public.carelaw_brands;
drop policy if exists "carelaw_franchisees_read_own"     on public.carelaw_franchisees;
drop policy if exists "carelaw_cases_read_own"           on public.carelaw_cases;
drop policy if exists "carelaw_cases_insert_own"         on public.carelaw_cases;
drop policy if exists "carelaw_messages_read_own"        on public.carelaw_messages;
drop policy if exists "carelaw_notifications_read_own"   on public.carelaw_notifications;
drop policy if exists "carelaw_notifications_update_own" on public.carelaw_notifications;
create policy "carelaw_brands_read_active"       on public.carelaw_brands        for select using (active = true);
create policy "carelaw_franchisees_read_own"     on public.carelaw_franchisees   for select using (true);
create policy "carelaw_cases_read_own"           on public.carelaw_cases         for select using (true);
create policy "carelaw_cases_insert_own"         on public.carelaw_cases         for insert with check (true);
create policy "carelaw_messages_read_own"        on public.carelaw_messages      for select using (true);
create policy "carelaw_notifications_read_own"   on public.carelaw_notifications for select using (true);
create policy "carelaw_notifications_update_own" on public.carelaw_notifications for update using (true);

-- 0. 헬퍼 함수 제거
drop function if exists public.carelaw_trusted();
drop function if exists public.carelaw_uid();
drop function if exists public.carelaw_user_role();
drop function if exists public.carelaw_brand_id();
drop function if exists public.carelaw_is_active();

commit;
