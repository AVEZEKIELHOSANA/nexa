-- Tests for migration 001. Run with:  psql -v ON_ERROR_STOP=1 -f supabase/tests/001_schema.test.sql
-- Everything happens inside one transaction that is rolled back at the end.
-- Any failed assertion raises an exception and stops the run.

begin;

-- ---------- structure ----------
do $$
declare n int;
begin
  select count(*) into n from pg_tables where schemaname = 'public';
  if n <> 16 then raise exception 'expected 16 public tables, found %', n; end if;

  select count(*) into n from pg_tables where schemaname = 'public' and not rowsecurity;
  if n <> 0 then raise exception '% public table(s) have RLS disabled', n; end if;

  select count(*) into n from pg_policies where schemaname = 'public';
  if n <> 0 then raise exception 'migration 001 should create no policies, found %', n; end if;

  select count(*) into n from information_schema.role_table_grants
   where table_schema = 'public' and grantee in ('anon', 'authenticated');
  if n <> 0 then raise exception 'anon/authenticated still hold % table grant(s)', n; end if;

  select count(*) into n from public.roles where is_system;
  if n <> 3 then raise exception 'expected 3 built-in roles, found %', n; end if;

  select count(*) into n from public.careers;
  if n < 9 then raise exception 'expected at least 9 seeded careers, found %', n; end if;

  -- every foreign key column should be covered by an index
  select count(*) into n from (
    select c.conrelid, c.conkey[1] as col
    from pg_constraint c
    where c.contype = 'f' and c.connamespace = 'public'::regnamespace
      and not exists (
        select 1 from pg_index i
        where i.indrelid = c.conrelid and i.indkey[0] = c.conkey[1]
      )
  ) x;
  if n <> 0 then raise exception '% foreign key(s) have no index', n; end if;

  -- helper/trigger functions must not be callable by anon
  select count(*) into n from pg_proc p
   where p.pronamespace = 'public'::regnamespace
     and p.proname in ('handle_new_user', 'guard_profile_changes')
     and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'));
  if n <> 0 then raise exception 'trigger functions are executable by API roles'; end if;
end $$;

-- ---------- sign-up trigger ----------
-- adult student with two interests (one valid, one bogus id)
insert into auth.users (id, email, raw_user_meta_data) values (
  '00000000-0000-0000-0000-0000000000a1', 'adult@example.com',
  jsonb_build_object('role', 'student', 'name', 'Ada Adult', 'date_of_birth', '2000-01-01',
    'career_interest_ids', jsonb_build_array((select id from public.careers where name = 'Law'),
                                              '11111111-1111-1111-1111-111111111111')));

do $$
declare n int;
begin
  if not (select is_active from public.profiles where id = '00000000-0000-0000-0000-0000000000a1') then
    raise exception 'adult student should be active'; end if;
  select count(*) into n from public.student_career_interests where student_id = '00000000-0000-0000-0000-0000000000a1';
  if n <> 1 then raise exception 'expected 1 valid interest, got %', n; end if;
  select count(*) into n from public.guardian_consents where student_id = '00000000-0000-0000-0000-0000000000a1';
  if n <> 0 then raise exception 'adult must not get a guardian consent row'; end if;
end $$;

-- minor: inactive + consent row with a hashed token
insert into auth.users (id, email, raw_user_meta_data) values (
  '00000000-0000-0000-0000-0000000000a2', 'minor@example.com',
  jsonb_build_object('role', 'student', 'name', 'Mina Minor',
    'date_of_birth', (current_date - interval '15 years')::date::text,
    'guardian_email', 'Parent@Example.com'));

do $$
declare r record;
begin
  if (select is_active from public.profiles where id = '00000000-0000-0000-0000-0000000000a2') then
    raise exception 'minor must start inactive'; end if;
  select * into r from public.guardian_consents where student_id = '00000000-0000-0000-0000-0000000000a2';
  if r.id is null then raise exception 'minor must get a guardian consent row'; end if;
  if r.guardian_email <> 'parent@example.com' then raise exception 'guardian email should be lower-cased'; end if;
  if length(r.token_hash) <> 64 then raise exception 'token_hash should be a sha256 hex string'; end if;
  if r.used_at is not null or r.expires_at <= now() then raise exception 'consent row should be unused and unexpired'; end if;
end $$;

-- minor without a guardian email, or using their own email, must be rejected
do $$
begin
  begin
    insert into auth.users (id, email, raw_user_meta_data) values (gen_random_uuid(), 'x1@example.com',
      jsonb_build_object('role','student','name','X','date_of_birth',(current_date - interval '12 years')::date::text));
    raise exception 'minor without guardian was accepted';
  exception when raise_exception then
    if sqlerrm like 'minor without guardian%' then raise; end if;
  end;
  begin
    insert into auth.users (id, email, raw_user_meta_data) values (gen_random_uuid(), 'same@example.com',
      jsonb_build_object('role','student','name','X','date_of_birth',(current_date - interval '12 years')::date::text,
                         'guardian_email','same@example.com'));
    raise exception 'guardian = own email was accepted';
  exception when raise_exception then
    if sqlerrm like 'guardian = own%' then raise; end if;
  end;
end $$;

-- role whitelist: asking for admin yields a student
insert into auth.users (id, email, raw_user_meta_data) values (
  '00000000-0000-0000-0000-0000000000a3', 'sneaky@example.com',
  jsonb_build_object('role', 'admin', 'name', 'Sneaky', 'date_of_birth', '1999-05-05'));
do $$
begin
  if (select r.name from public.profiles p join public.roles r on r.id = p.role_id
      where p.id = '00000000-0000-0000-0000-0000000000a3') <> 'student' then
    raise exception 'role whitelist failed: self-selected admin was honoured';
  end if;
end $$;

-- professional needs a valid career; valid one starts pending
do $$
begin
  begin
    insert into auth.users (id, email, raw_user_meta_data) values (gen_random_uuid(), 'p0@example.com',
      jsonb_build_object('role','professional','name','NoCareer'));
    raise exception 'professional without career was accepted';
  exception when raise_exception then
    if sqlerrm like 'professional without%' then raise; end if;
  end;
end $$;

insert into auth.users (id, email, raw_user_meta_data) values (
  '00000000-0000-0000-0000-0000000000b1', 'pro@example.com',
  jsonb_build_object('role', 'professional', 'name', 'Pat Pro', 'experience_years', '8', 'bio', 'Lawyer',
    'career_id', (select id from public.careers where name = 'Law')));
do $$
begin
  if (select verification_status from public.professional_profiles where user_id = '00000000-0000-0000-0000-0000000000b1') <> 'pending' then
    raise exception 'new professional should be pending'; end if;
end $$;

-- ---------- database rules ----------
do $$
declare
  pro uuid := '00000000-0000-0000-0000-0000000000b1';
  stu uuid := '00000000-0000-0000-0000-0000000000a1';
  slot1 uuid; slot2 uuid; r1 uuid;
begin
  insert into public.availability_slots (professional_id, start_time, end_time)
    values (pro, now() + interval '1 day', now() + interval '1 day 1 hour') returning id into slot1;

  -- overlap is rejected
  begin
    insert into public.availability_slots (professional_id, start_time, end_time)
      values (pro, now() + interval '1 day 30 minutes', now() + interval '1 day 90 minutes');
    raise exception 'overlapping slot was accepted';
  exception when exclusion_violation then null; end;

  -- back-to-back is fine; overlapping a CANCELLED slot is fine
  insert into public.availability_slots (professional_id, start_time, end_time)
    values (pro, now() + interval '1 day 1 hour', now() + interval '1 day 2 hours') returning id into slot2;
  update public.availability_slots set status = 'cancelled' where id = slot2;
  insert into public.availability_slots (professional_id, start_time, end_time)
    values (pro, now() + interval '1 day 1 hour', now() + interval '1 day 2 hours');

  -- end must be after start
  begin
    insert into public.availability_slots (professional_id, start_time, end_time)
      values (pro, now() + interval '5 days', now() + interval '5 days');
    raise exception 'zero-length slot was accepted';
  exception when check_violation then null; end;

  -- only one accepted request per slot; duplicate pending per student/slot rejected
  insert into public.mentorship_requests (student_id, professional_id, availability_slot_id, status)
    values (stu, pro, slot1, 'pending') returning id into r1;
  begin
    insert into public.mentorship_requests (student_id, professional_id, availability_slot_id, status)
      values (stu, pro, slot1, 'pending');
    raise exception 'duplicate pending request was accepted';
  exception when unique_violation then null; end;

  update public.mentorship_requests set status = 'accepted' where id = r1;
  begin
    insert into public.mentorship_requests (student_id, professional_id, availability_slot_id, status)
      values ('00000000-0000-0000-0000-0000000000a3', pro, slot1, 'accepted');
    raise exception 'second accepted request on one slot was accepted';
  exception when unique_violation then null; end;

  -- message length limit
  begin
    insert into public.messages (mentorship_request_id, sender_id, body) values (r1, stu, repeat('x', 2001));
    raise exception 'over-long message was accepted';
  exception when check_violation then null; end;

  -- a peer connection can exist only once per pair, in either direction
  insert into public.peer_connections (requester_id, recipient_id) values (stu, '00000000-0000-0000-0000-0000000000a3');
  begin
    insert into public.peer_connections (requester_id, recipient_id) values ('00000000-0000-0000-0000-0000000000a3', stu);
    raise exception 'reverse duplicate peer connection was accepted';
  exception when unique_violation then null; end;
end $$;

-- ---------- deny by default through the API roles ----------
set local role anon;
do $$
begin
  begin perform 1 from public.careers; raise exception 'anon could read careers';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

set local role authenticated;
do $$
begin
  begin perform 1 from public.profiles; raise exception 'authenticated could read profiles with no policy/grant';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- ---------- role-escalation guard ----------
-- Temporarily give profiles a self-update policy (the real one arrives on Day 2)
-- so we can prove the trigger blocks a promotion even when the policy allows the row.
grant select, update on public.profiles to authenticated;
create policy tmp_self_select on public.profiles for select to authenticated using (true);
create policy tmp_self_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
set local role authenticated;
do $$
begin
  update public.profiles set name = 'Ada Renamed' where id = auth.uid();      -- allowed
  begin
    update public.profiles set role_id = (select id from public.roles where name = 'admin') where id = auth.uid();
    raise exception 'student promoted themselves to admin';
  exception when insufficient_privilege then null; end;
  begin
    update public.profiles set is_active = false where id = auth.uid();
    raise exception 'student changed their own is_active';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- a real admin may change another user's status
select set_config('request.jwt.claim.sub', '', true);                           -- SQL editor / service role: no user
update public.profiles set role_id = (select id from public.roles where name = 'admin')
 where id = '00000000-0000-0000-0000-0000000000a3';
create policy tmp_admin_update on public.profiles for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a3', true);
set local role authenticated;
do $$
begin
  if public.current_access_level() <> 'admin' then raise exception 'admin level not detected'; end if;
  update public.profiles set is_active = true where id = '00000000-0000-0000-0000-0000000000a2';
  if not (select is_active from public.profiles where id = '00000000-0000-0000-0000-0000000000a2') then
    raise exception 'admin could not activate a user';
  end if;
end $$;
reset role;

rollback;

\echo 'ALL MIGRATION 001 TESTS PASSED'
