-- 케어로 테넌트 격리 RLS 교체 (3단계)
-- Firebase Third-Party Auth(JWT) 기반. 모든 정책에 issuer-pin 포함(공유 DB 방어층).
-- service_role(Functions)은 BYPASSRLS이므로 영향 없음(채팅 등 서버 로직 유지).
-- 적용: 승인 후. 적용 직후 E 검증 → 깨지면 동일 디렉토리 .rollback.sql 실행.

begin;

-- ── 0. JWT 클레임 헬퍼 (SECURITY INVOKER, 현재 요청 JWT를 읽음) ──────────
create or replace function public.carelaw_trusted() returns boolean
  language sql stable as $$
    select coalesce(auth.jwt()->>'iss' = 'https://securetoken.google.com/care-law', false)
  $$;
create or replace function public.carelaw_uid() returns text
  language sql stable as $$ select auth.jwt()->>'sub' $$;
create or replace function public.carelaw_user_role() returns text
  language sql stable as $$ select auth.jwt()->>'user_role' $$;
create or replace function public.carelaw_brand_id() returns uuid
  language sql stable as $$ select nullif(auth.jwt()->>'brand_id','')::uuid $$;
create or replace function public.carelaw_is_active() returns boolean
  language sql stable as $$ select coalesce((auth.jwt()->>'active')::boolean, false) $$;

-- ── 1. 기존 느슨한 정책 제거 (using(true) 계열) ──────────────────────────
drop policy if exists "carelaw_brands_read_active"        on public.carelaw_brands;
drop policy if exists "carelaw_franchisees_read_own"      on public.carelaw_franchisees;
drop policy if exists "carelaw_cases_read_own"            on public.carelaw_cases;
drop policy if exists "carelaw_cases_insert_own"          on public.carelaw_cases;
drop policy if exists "carelaw_messages_read_own"         on public.carelaw_messages;
drop policy if exists "carelaw_notifications_read_own"    on public.carelaw_notifications;
drop policy if exists "carelaw_notifications_update_own"  on public.carelaw_notifications;
-- 새 정책도 선제 정리(재실행 안전성 — 부분 적용/재시도 대비)
drop policy if exists "carelaw_brands_anon_public"   on public.carelaw_brands;
drop policy if exists "carelaw_brands_auth_select"   on public.carelaw_brands;
drop policy if exists "carelaw_cases_select"         on public.carelaw_cases;
drop policy if exists "carelaw_cases_insert"         on public.carelaw_cases;
drop policy if exists "carelaw_messages_select"      on public.carelaw_messages;
drop policy if exists "carelaw_franchisees_select"   on public.carelaw_franchisees;
drop policy if exists "carelaw_notifications_select" on public.carelaw_notifications;
drop policy if exists "carelaw_notifications_update" on public.carelaw_notifications;
drop policy if exists "carelaw_subscriptions_select" on public.carelaw_subscriptions;

-- ── 2. anon 권한 회수(브랜드 제외 전 테넌트 테이블 차단, 방어층) ────────
revoke all on public.carelaw_cases         from anon;
revoke all on public.carelaw_messages       from anon;
revoke all on public.carelaw_franchisees    from anon;
revoke all on public.carelaw_subscriptions  from anon;
revoke all on public.carelaw_notifications  from anon;
revoke all on public.carelaw_invites        from anon;

-- ── 3. carelaw_brands : anon은 비-PII 컬럼만, authenticated는 자기 브랜드 ──
-- (C) anon에 select * 금지: 컬럼 권한으로 owner_email/owner_uid 등 PII 차단
revoke select on public.carelaw_brands from anon;
grant  select (id, subdomain, name, app_name, logo_url, primary_color, active)
       on public.carelaw_brands to anon;

-- anon: 활성 브랜드 행만(서브도메인 해석용). 컬럼은 위 grant로 제한됨.
create policy "carelaw_brands_anon_public" on public.carelaw_brands
  for select to anon using (active = true);

-- authenticated: 어드민 전체 / 본사·점주는 자기 브랜드만
create policy "carelaw_brands_auth_select" on public.carelaw_brands
  for select to authenticated using (
    carelaw_trusted() and (
      carelaw_user_role() = 'admin' or id = carelaw_brand_id()
    )
  );

-- 공개 뷰(비-PII 컬럼만). invoker → base의 anon 행정책+컬럼권한을 그대로 사용(정의자뷰 미생성 = Advisor clean)
create or replace view public.carelaw_public_brands
  with (security_invoker = on) as
  select id, subdomain, name, app_name, logo_url, primary_color, active
  from public.carelaw_brands
  where active = true;
grant select on public.carelaw_public_brands to anon, authenticated;

-- ── 4. carelaw_cases : 점주=자기 uid / 본사=자기 brand / 어드민=전체 + active 게이트 ──
create policy "carelaw_cases_select" on public.carelaw_cases
  for select to authenticated using (
    carelaw_trusted() and (
      carelaw_user_role() = 'admin'
      or (carelaw_user_role() = 'franchisor' and brand_id = carelaw_brand_id())
      or (carelaw_user_role() = 'franchisee' and user_uid = carelaw_uid() and carelaw_is_active())
    )
  );

-- (B) 쓰기 위조 차단: 점주는 자기 uid+brand로만 INSERT 가능
create policy "carelaw_cases_insert" on public.carelaw_cases
  for insert to authenticated with check (
    carelaw_trusted()
    and carelaw_user_role() = 'franchisee'
    and carelaw_is_active()
    and user_uid = carelaw_uid()
    and brand_id = carelaw_brand_id()
  );
-- UPDATE/DELETE 클라이언트 정책 없음 → 거부(상태변경 등은 Functions service_role).

-- ── 5. carelaw_messages : 부모 케이스가 보일 때만(케이스 RLS가 소유 필터) ──
create policy "carelaw_messages_select" on public.carelaw_messages
  for select to authenticated using (
    carelaw_trusted()
    and exists (select 1 from public.carelaw_cases c where c.id = carelaw_messages.case_id)
  );
-- INSERT 클라이언트 정책 없음 → 거부(메시지는 chatWithAI service_role이 기록).

-- ── 6. carelaw_franchisees : 점주=자기 / 본사=자기 brand / 어드민=전체 ──
create policy "carelaw_franchisees_select" on public.carelaw_franchisees
  for select to authenticated using (
    carelaw_trusted() and (
      carelaw_user_role() = 'admin'
      or (carelaw_user_role() = 'franchisor' and brand_id = carelaw_brand_id())
      or (carelaw_user_role() = 'franchisee' and uid = carelaw_uid())
    )
  );
-- 쓰기는 Functions(service_role).

-- ── 7. carelaw_notifications : 본인 것만 읽기/읽음처리 ──────────────────
create policy "carelaw_notifications_select" on public.carelaw_notifications
  for select to authenticated using (
    carelaw_trusted() and (carelaw_user_role() = 'admin' or target_uid = carelaw_uid())
  );
create policy "carelaw_notifications_update" on public.carelaw_notifications
  for update to authenticated
  using      (carelaw_trusted() and target_uid = carelaw_uid())
  with check (carelaw_trusted() and target_uid = carelaw_uid());

-- ── 8. (D) carelaw_subscriptions : 본사=자기 brand / 어드민=전체 (deny-all 해소) ──
create policy "carelaw_subscriptions_select" on public.carelaw_subscriptions
  for select to authenticated using (
    carelaw_trusted() and (
      carelaw_user_role() = 'admin'
      or (carelaw_user_role() = 'franchisor' and brand_id = carelaw_brand_id())
    )
  );
-- 쓰기는 Functions(service_role).

-- carelaw_invites : 정책 없음 유지(deny-all). 초대 검증은 Functions(service_role).

-- ── 9. plan_limits 정의자뷰 → invoker (Advisor CRITICAL 해소) ───────────
alter view public.carelaw_plan_limits set (security_invoker = on);

-- ── 10. 무커밋 격리 검증 (COMMIT 전 같은 트랜잭션). 실패 시 raise → 자동 ROLLBACK ──
do $$
declare
  v_cnt        int;
  v_real_uid   text := '8Kl2OEJMrCcjgfcnT5aPwe8Bim12';                -- chungsong7 (점주, brand A)
  v_brand_a    uuid := '9acf4f00-d782-4594-a3d2-fd8497978d22';         -- 호막 브랜드(실데이터)
  v_brand_b    uuid := '00000000-0000-0000-0000-0000000000bb';         -- 가상의 다른 테넌트
  v_forgery_allowed boolean := false;
begin
  -- (sanity) 실 점주 chungsong7: 자기 케이스가 보여야 함(정책 과도제한 아님)
  perform set_config('request.jwt.claims', json_build_object(
    'iss','https://securetoken.google.com/care-law','sub',v_real_uid,
    'user_role','franchisee','brand_id',v_brand_a::text,'active',true)::text, true);
  set local role authenticated;
  select count(*) into v_cnt from public.carelaw_cases;
  reset role;
  if v_cnt < 1 then raise exception '[SANITY] 실 점주가 자기 케이스를 못 봄(=0). 정책 과도제한'; end if;

  -- (격리1) brand B 점주 임퍼소네이션 → brand A 케이스 0건
  perform set_config('request.jwt.claims', json_build_object(
    'iss','https://securetoken.google.com/care-law','sub','intruder-b-uid',
    'user_role','franchisee','brand_id',v_brand_b::text,'active',true)::text, true);
  set local role authenticated;
  select count(*) into v_cnt from public.carelaw_cases where brand_id = v_brand_a;
  reset role;
  if v_cnt <> 0 then raise exception '[격리] brand B 점주가 brand A 케이스 조회=% (격리 실패)', v_cnt; end if;

  -- (격리2) brand B 본사 임퍼소네이션 → brand A 케이스·메시지 0건
  perform set_config('request.jwt.claims', json_build_object(
    'iss','https://securetoken.google.com/care-law','sub','intruder-b-franchisor',
    'user_role','franchisor','brand_id',v_brand_b::text,'active',true)::text, true);
  set local role authenticated;
  select count(*) into v_cnt from public.carelaw_cases;     -- 본사 정책: brand_id=B → A 데이터 안 보임
  if v_cnt <> 0 then reset role; raise exception '[격리] brand B 본사가 케이스 조회=% (격리 실패)', v_cnt; end if;
  select count(*) into v_cnt from public.carelaw_messages;  -- 메시지: 보이는 케이스 없음 → 0
  reset role;
  if v_cnt <> 0 then raise exception '[격리] brand B 본사가 메시지 조회=% (격리 실패)', v_cnt; end if;

  -- (anon) 익명 → 권한 회수(revoke)로 permission denied 이거나 0행이어야(둘 다 차단=통과)
  perform set_config('request.jwt.claims', '', true);
  set local role anon;
  begin
    select count(*) into v_cnt from public.carelaw_cases;
    if v_cnt <> 0 then raise exception '[anon] 익명이 케이스 조회=%', v_cnt; end if;
    select count(*) into v_cnt from public.carelaw_messages;
    if v_cnt <> 0 then raise exception '[anon] 익명이 메시지 조회=%', v_cnt; end if;
  exception
    when insufficient_privilege then null;  -- 권한 자체 거부 = 정상(더 강한 차단)
  end;
  reset role;

  -- (쓰기위조) 실 점주 chungsong7이 다른 brand_id(B)로 cases INSERT → WITH CHECK 거부되어야
  perform set_config('request.jwt.claims', json_build_object(
    'iss','https://securetoken.google.com/care-law','sub',v_real_uid,
    'user_role','franchisee','brand_id',v_brand_a::text,'active',true)::text, true);
  set local role authenticated;
  begin
    insert into public.carelaw_cases (user_uid, brand_id, type, status, title)
      values (v_real_uid, v_brand_b, 'other', 'open', '__forgery_test__');
    v_forgery_allowed := true;            -- 여기 도달 = 위조 허용됨(실패)
  exception when others then
    v_forgery_allowed := false;           -- 거부됨(정상)
  end;
  reset role;
  if v_forgery_allowed then raise exception '[쓰기위조] 다른 brand_id INSERT가 허용됨(WITH CHECK 실패)'; end if;

  raise notice '[검증 통과] 테넌트 격리·쓰기위조 차단 OK → COMMIT 진행';
end $$;

commit;
