-- TEST ONLY. Loaded right after mock_supabase.sql (scripts/test-db.sh loads every mock_*.sql in order).
-- Adds the extra pieces of Supabase that the Day 4-8 migrations touch (storage, realtime,
-- more auth.users columns) plus small helpers for writing RLS tests.
-- Never run this against a real Supabase project.

-- auth.users: columns used by admin_list_users and the invite branch of handle_new_user
alter table auth.users add column if not exists raw_app_meta_data jsonb default '{}'::jsonb;
alter table auth.users add column if not exists last_sign_in_at   timestamptz;
alter table auth.users add column if not exists email_confirmed_at timestamptz;
alter table auth.users add column if not exists banned_until      timestamptz;

-- Storage (the real one is managed by Supabase)
create schema if not exists storage;
create table if not exists storage.buckets (
  id                 text primary key,
  name               text not null,
  public             boolean default false,
  file_size_limit    bigint,
  allowed_mime_types text[]
);
create table if not exists storage.objects (
  id        uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name      text,
  owner     uuid,
  metadata  jsonb
);
alter table storage.objects enable row level security;
create or replace function storage.foldername(name text) returns text[]
language sql immutable as $$
  select (string_to_array(name, '/'))[1:greatest(array_length(string_to_array(name, '/'), 1) - 1, 0)]
$$;
grant usage on schema storage to anon, authenticated, service_role;
grant select, insert, update, delete on storage.objects to authenticated;
grant select on storage.buckets to authenticated;

-- Realtime publication (exists by default on Supabase)
do $$ begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- Test helpers: switch the current "user" and assert outcomes
--   select test.as_user('<uuid>');   -- act as that signed-in user (role authenticated)
--   select test.as_anon();           -- act as a logged-out visitor
--   select test.reset();             -- back to the superuser / service role (no auth.uid())
--   select test.fails($$ sql $$, '42501');   -- sql must fail (optionally with this SQLSTATE)
--   select test.ok($$ sql $$);               -- sql must succeed
--   select test.assert(cond, 'message');
-- ---------------------------------------------------------------------
create schema if not exists test;
grant usage on schema test to public;

create or replace function test.as_user(p_user uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', p_user::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end $$;

create or replace function test.as_anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '', true);
  execute 'set local role anon';
end $$;

create or replace function test.reset() returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '', true);
end $$;

create or replace function test.fails(p_sql text, p_state text default null) returns void language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    if p_state is not null and sqlstate <> p_state then
      raise exception 'expected SQLSTATE % but got % (%) for: %', p_state, sqlstate, sqlerrm, p_sql;
    end if;
    return;
  end;
  raise exception 'expected this to fail but it succeeded: %', p_sql;
end $$;

create or replace function test.ok(p_sql text) returns void language plpgsql as $$
begin
  execute p_sql;
end $$;

create or replace function test.assert(p_cond boolean, p_msg text) returns void language plpgsql as $$
begin
  if p_cond is not true then raise exception 'ASSERTION FAILED: %', p_msg; end if;
end $$;

grant execute on all functions in schema test to public;
