-- Tests for the Day 4 migration (admin core). Runs in one transaction that is rolled back.
-- Needs supabase/tests/mock_supabase_extra.sql (test.* helpers) to be loaded first.
\o /dev/null
begin;

-- ---------- fixtures: an admin, a second admin, a student, a pro, an outsider pro ----------
-- (the admins are made by the service role, as the README's "first admin" step does)
insert into auth.users (id, email, raw_user_meta_data, email_confirmed_at) values
  ('40000000-0000-0000-0000-00000000000a', 'admin@example.com',  '{"name":"Alice Admin","date_of_birth":"1990-01-01"}', now()),
  ('40000000-0000-0000-0000-00000000000b', 'admin2@example.com', '{"name":"Bob Admin","date_of_birth":"1990-01-01"}', now()),
  ('40000000-0000-0000-0000-0000000000a1', 'stu@example.com',    '{"name":"Sam Student","date_of_birth":"2000-01-01"}', now());
insert into auth.users (id, email, raw_user_meta_data)
  select '40000000-0000-0000-0000-0000000000b1', 'pro@example.com',
         jsonb_build_object('role','professional','name','Pat Pro','career_id', c.id::text, 'bio','Lawyer')
  from public.careers c where c.name = 'Law';
update public.profiles set role_id = (select id from public.roles where name = 'admin')
 where id in ('40000000-0000-0000-0000-00000000000a', '40000000-0000-0000-0000-00000000000b');

-- ---------- structure and privileges ----------
do $$
begin
  perform test.assert(not has_function_privilege('anon', 'public.admin_list_users(text,uuid,boolean,integer,integer,text,text,boolean,boolean)', 'execute'),
    'anon must not execute admin_list_users');
  perform test.assert(not has_function_privilege('authenticated', 'public.log_admin_action(text,text,uuid,jsonb,uuid)', 'execute'),
    'authenticated must not execute log_admin_action');
  perform test.assert(not has_function_privilege('authenticated', 'public.user_has_linked_records(uuid)', 'execute'),
    'authenticated must not execute user_has_linked_records');
  perform test.assert(not has_function_privilege('anon', 'public.verify_professional(uuid)', 'execute'),
    'anon must not execute verify_professional');
  perform test.assert((select count(*) from pg_tables where schemaname = 'public' and not rowsecurity) = 0,
    'RLS must stay on for every table');
end $$;

-- ---------- roles ----------
select test.as_user('40000000-0000-0000-0000-0000000000a1');       -- student
select test.fails($$ insert into public.roles (name, access_level) values ('hacker', 'admin') $$, '42501');
select test.assert((select count(*) from public.roles) = 3, 'a student can read the roles');
select test.reset();

select test.as_user('40000000-0000-0000-0000-00000000000a');       -- admin
select test.ok($$ insert into public.roles (name, description, access_level) values ('mentor-lead', 'Lead mentor', 'professional') $$);
select test.fails($$ insert into public.roles (name, access_level, is_system) values ('fake-system', 'admin', true) $$, '42501');
do $$
begin
  perform test.assert((select description from public.roles where name = 'student') like 'Built-in%',
    'system role must not be editable');
  update public.roles set description = 'Leads mentors' where name = 'mentor-lead';
  perform test.assert((select description from public.roles where name = 'mentor-lead') = 'Leads mentors', 'custom role edit');
end $$;
select test.reset();

-- system roles: an update or delete matches 0 rows (filtered by RLS) rather than raising an error
select test.as_user('40000000-0000-0000-0000-00000000000a');
do $$
declare n int;
begin
  update public.roles set description = 'tampered' where name = 'student';
  get diagnostics n = row_count;
  perform test.assert(n = 0, 'system role update must affect 0 rows');
  delete from public.roles where name = 'student';
  get diagnostics n = row_count;
  perform test.assert(n = 0, 'system role delete must affect 0 rows');
end $$;
select test.reset();

-- a role with users cannot be deleted or change level; an unused one can be deleted
update public.profiles set role_id = (select id from public.roles where name = 'mentor-lead')
 where id = '40000000-0000-0000-0000-0000000000b1';
select test.as_user('40000000-0000-0000-0000-00000000000a');
do $$
declare n int;
begin
  delete from public.roles where name = 'mentor-lead';
  get diagnostics n = row_count;
  perform test.assert(n = 0, 'role with users must not be deletable');
end $$;
select test.fails($$ update public.roles set access_level = 'student' where name = 'mentor-lead' $$, '23514');
select test.reset();
update public.profiles set role_id = (select id from public.roles where name = 'professional')
 where id = '40000000-0000-0000-0000-0000000000b1';
select test.as_user('40000000-0000-0000-0000-00000000000a');
do $$
declare n int;
begin
  delete from public.roles where name = 'mentor-lead';
  get diagnostics n = row_count;
  perform test.assert(n = 1, 'unused custom role should be deletable');
end $$;
select test.reset();

-- ---------- careers ----------
select test.as_anon();
select test.assert((select count(*) from public.careers) >= 9, 'visitors can read careers');
select test.fails($$ insert into public.careers (name) values ('Nope') $$, '42501');
select test.reset();
select test.as_user('40000000-0000-0000-0000-0000000000a1');
select test.fails($$ insert into public.careers (name) values ('Nope') $$, '42501');
select test.reset();
select test.as_user('40000000-0000-0000-0000-00000000000a');
select test.ok($$ insert into public.careers (name, description) values ('Architecture', 'Designing buildings') $$);
select test.ok($$ update public.careers set is_active = false where name = 'Architecture' $$);
select test.reset();

-- ---------- activity log ----------
do $$
begin
  perform test.assert((select count(*) from public.admin_activity_log where action = 'role.create') = 1, 'role.create logged');
  perform test.assert((select count(*) from public.admin_activity_log where action = 'role.update') = 1, 'role.update logged');
  perform test.assert((select count(*) from public.admin_activity_log where action = 'role.delete') = 1, 'role.delete logged');
  perform test.assert((select count(*) from public.admin_activity_log where action = 'career.create') = 1, 'career.create logged');
  perform test.assert((select count(*) from public.admin_activity_log where action = 'career.archive') = 1, 'career.archive logged');
  perform test.assert((select admin_id from public.admin_activity_log where action = 'role.create') = '40000000-0000-0000-0000-00000000000a', 'log records the admin');
end $$;
select test.as_user('40000000-0000-0000-0000-0000000000a1');
select test.assert((select count(*) from public.admin_activity_log) = 0, 'a student sees no activity log rows');
select test.fails($$ insert into public.admin_activity_log (action) values ('forged') $$, '42501');
select test.reset();
select test.as_user('40000000-0000-0000-0000-00000000000a');
select test.assert((select count(*) from public.admin_activity_log) >= 5, 'admin can read the activity log');
select test.fails($$ insert into public.admin_activity_log (action) values ('forged') $$, '42501');
select test.fails($$ select public.log_admin_action('forged') $$, '42501');
select test.fails($$ update public.admin_activity_log set action = 'edited' $$, '42501');
select test.fails($$ delete from public.admin_activity_log $$, '42501');
select test.reset();

-- ---------- verification ----------
select test.as_user('40000000-0000-0000-0000-0000000000a1');
select test.fails($$ select public.verify_professional('40000000-0000-0000-0000-0000000000b1') $$, '42501');
select test.reset();

-- a professional cannot self-verify, even with a policy that lets them update their row
select test.as_user('40000000-0000-0000-0000-0000000000b1');
select test.fails($$ update public.professional_profiles set verification_status = 'verified' where user_id = auth.uid() $$, '42501');
select test.ok($$ update public.professional_profiles set bio = 'Senior lawyer', credentials_path = auth.uid()::text || '/cv.pdf' where user_id = auth.uid() $$);
select test.reset();

select test.as_user('40000000-0000-0000-0000-00000000000a');
select test.fails($$ select public.reject_professional('40000000-0000-0000-0000-0000000000b1', 'no') $$, '22023');   -- reason too short
select test.ok($$ select public.reject_professional('40000000-0000-0000-0000-0000000000b1', 'The document is unreadable') $$);
select test.reset();
do $$
begin
  perform test.assert((select verification_status from public.professional_profiles where user_id = '40000000-0000-0000-0000-0000000000b1') = 'rejected', 'rejected');
  perform test.assert((select rejection_reason from public.professional_profiles where user_id = '40000000-0000-0000-0000-0000000000b1') = 'The document is unreadable', 'reason stored');
end $$;

-- re-uploading credentials after a rejection sends the application back to pending
select test.as_user('40000000-0000-0000-0000-0000000000b1');
select test.ok($$ update public.professional_profiles set credentials_path = auth.uid()::text || '/cv2.pdf' where user_id = auth.uid() $$);
select test.reset();
do $$
begin
  perform test.assert((select verification_status from public.professional_profiles where user_id = '40000000-0000-0000-0000-0000000000b1') = 'pending', 'back to pending after re-upload');
  perform test.assert((select rejection_reason from public.professional_profiles where user_id = '40000000-0000-0000-0000-0000000000b1') is null, 'reason cleared');
end $$;

select test.as_user('40000000-0000-0000-0000-00000000000a');
select test.ok($$ select public.verify_professional('40000000-0000-0000-0000-0000000000b1') $$);
select test.fails($$ select public.verify_professional('40000000-0000-0000-0000-0000000000ff') $$, 'P0002');
select test.reset();
do $$
begin
  perform test.assert((select verification_status from public.professional_profiles where user_id = '40000000-0000-0000-0000-0000000000b1') = 'verified', 'verified');
  perform test.assert((select verified_by from public.professional_profiles where user_id = '40000000-0000-0000-0000-0000000000b1') = '40000000-0000-0000-0000-00000000000a', 'verified_by recorded');
  perform test.assert((select count(*) from public.admin_activity_log where action in ('professional.verify','professional.reject')) = 2, 'verification actions logged');
end $$;

-- ---------- admin_list_users / admin_list_professionals ----------
select test.as_user('40000000-0000-0000-0000-0000000000a1');
select test.fails($$ select * from public.admin_list_users() $$, '42501');
select test.fails($$ select * from public.admin_list_professionals() $$, '42501');
select test.reset();

select test.as_anon();
select test.fails($$ select * from public.admin_list_users() $$, '42501');
select test.reset();

select test.as_user('40000000-0000-0000-0000-00000000000a');
do $$
declare r record;
begin
  perform test.assert((select count(*) from public.admin_list_users()) = 4, 'lists the 4 fixture users');
  perform test.assert((select max(total_count) from public.admin_list_users()) = 4, 'total_count');
  perform test.assert((select count(*) from public.admin_list_users(p_search => 'PRO@EXAMPLE')) = 1, 'search by email (case-insensitive)');
  perform test.assert((select count(*) from public.admin_list_users(p_search => 'sam')) = 1, 'search by name');
  perform test.assert((select count(*) from public.admin_list_users(p_search => '%')) = 0, 'a % in the search is literal, not a wildcard');
  perform test.assert((select count(*) from public.admin_list_users(p_access_level => 'admin')) = 2, 'filter by access level');
  perform test.assert((select count(*) from public.admin_list_users(p_page => 2, p_page_size => 3)) = 1, 'pagination: 4 users, page 2 of size 3 has 1');
  perform test.assert((select max(total_count) from public.admin_list_users(p_page => 2, p_page_size => 3)) = 4, 'total_count is the full count on every page');
  select * into r from public.admin_list_users(p_sort => 'name', p_desc => false) limit 1;
  perform test.assert(r.name = 'Alice Admin', 'sort by name ascending');
  perform test.assert((select email from public.admin_list_users(p_search => 'stu@')) = 'stu@example.com', 'email is returned');
  perform test.assert((select count(*) from public.admin_list_professionals(p_status => 'verified')) = 1, 'professionals list by status');
  perform test.assert((select career_name from public.admin_list_professionals()) = 'Law', 'career name joined');
  perform test.assert((select has_credentials from public.admin_list_professionals()) , 'has_credentials');
end $$;
select test.fails($$ select * from public.admin_list_professionals(p_status => 'bogus') $$, '22023');
select test.reset();

-- ---------- profile edits by an admin are logged; last-admin protection ----------
select test.as_user('40000000-0000-0000-0000-00000000000a');
select test.ok($$ update public.profiles set is_active = false where id = '40000000-0000-0000-0000-0000000000a1' $$);
select test.ok($$ update public.profiles set name = 'Samuel Student' where id = '40000000-0000-0000-0000-0000000000a1' $$);
select test.ok($$ update public.profiles set role_id = (select id from public.roles where name = 'professional') where id = '40000000-0000-0000-0000-0000000000a1' $$);
select test.ok($$ update public.profiles set role_id = (select id from public.roles where name = 'student') where id = '40000000-0000-0000-0000-0000000000a1' $$);
select test.reset();
do $$
begin
  perform test.assert((select count(*) from public.admin_activity_log where action = 'user.deactivate') = 1, 'deactivate logged');
  perform test.assert((select count(*) from public.admin_activity_log where action = 'user.rename') = 1, 'rename logged');
  perform test.assert((select count(*) from public.admin_activity_log where action = 'user.change_role') = 2, 'role change logged');
end $$;

select test.as_user('40000000-0000-0000-0000-00000000000a');
select test.ok($$ update public.profiles set is_active = false where id = '40000000-0000-0000-0000-00000000000b' $$);   -- Bob out, Alice is the only one left
select test.fails($$ update public.profiles set is_active = false where id = '40000000-0000-0000-0000-00000000000a' $$, '23514');
select test.fails($$ update public.profiles set role_id = (select id from public.roles where name = 'student') where id = '40000000-0000-0000-0000-00000000000a' $$, '23514');
select test.reset();
select test.fails($$ update public.profiles set deleted_at = now() where id = '40000000-0000-0000-0000-00000000000a' $$, '23514');   -- service role too
select test.fails($$ delete from auth.users where id = '40000000-0000-0000-0000-00000000000a' $$, '23514');

-- a non-admin cannot promote themselves even if a self-update policy exists (the Day 2 policy lets
-- people edit their own row; this temporary one stands in for it, and is rolled back with the rest)
create policy tmp_self_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy tmp_self_select on public.profiles for select to authenticated using (id = auth.uid());
select test.as_user('40000000-0000-0000-0000-0000000000a1');
select test.fails($$ update public.profiles set role_id = (select id from public.roles where name = 'admin') where id = auth.uid() $$, '42501');
select test.reset();

-- ---------- user_has_linked_records ----------
do $$
begin
  perform test.assert(not public.user_has_linked_records('40000000-0000-0000-0000-0000000000a1'), 'fresh student has no linked records');
  perform test.assert(public.user_has_linked_records('40000000-0000-0000-0000-00000000000a'), 'an admin with log entries / verifications is linked');
  perform test.assert(not public.user_has_linked_records('40000000-0000-0000-0000-0000000000b1'), 'a professional with no slots or requests is not linked');
end $$;

-- ---------- invite branch of handle_new_user ----------
insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data) values
  ('40000000-0000-0000-0000-0000000000c1', 'invited-admin@example.com', '{"name":"Ivy Invited"}',
   jsonb_build_object('nexa_invite', jsonb_build_object('role_id', (select id from public.roles where name = 'admin'))));
insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data) values
  ('40000000-0000-0000-0000-0000000000c2', 'invited-pro@example.com', '{"name":"Ian Invited"}',
   jsonb_build_object('nexa_invite', jsonb_build_object('role_id', (select id from public.roles where name = 'professional'),
                                                        'career_id', (select id from public.careers where name = 'Law'))));
insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data) values
  ('40000000-0000-0000-0000-0000000000c3', 'invited-student@example.com', '{"name":"Isa Invited"}',
   jsonb_build_object('nexa_invite', jsonb_build_object('role_id', (select id from public.roles where name = 'student'),
                                                        'date_of_birth', '1995-05-05')));
do $$
begin
  perform test.assert((select r.access_level from public.profiles p join public.roles r on r.id = p.role_id where p.id = '40000000-0000-0000-0000-0000000000c1') = 'admin', 'invited admin');
  perform test.assert(exists (select 1 from public.professional_profiles where user_id = '40000000-0000-0000-0000-0000000000c2'), 'invited professional row');
  perform test.assert(exists (select 1 from public.student_profiles where user_id = '40000000-0000-0000-0000-0000000000c3'), 'invited student row');
  perform test.assert((select is_active from public.profiles where id = '40000000-0000-0000-0000-0000000000c3'), 'invited student is active');
end $$;
-- invited minors and invited professionals without a career are refused
select test.fails($$ insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data) values
  (gen_random_uuid(), 'minor-invite@example.com', '{"name":"M"}',
   jsonb_build_object('nexa_invite', jsonb_build_object('role_id', (select id from public.roles where name = 'student'),
                                                        'date_of_birth', (current_date - interval '15 years')::date::text))) $$);
select test.fails($$ insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data) values
  (gen_random_uuid(), 'pro-invite@example.com', '{"name":"P"}',
   jsonb_build_object('nexa_invite', jsonb_build_object('role_id', (select id from public.roles where name = 'professional')))) $$);
-- a PUBLIC sign-up cannot use the invite path: user metadata is ignored for it
select test.fails($$ insert into auth.users (id, email, raw_user_meta_data) values
  (gen_random_uuid(), 'sneaky-invite@example.com',
   jsonb_build_object('name','Sneaky', 'nexa_invite', jsonb_build_object('role_id', (select id from public.roles where name = 'admin')))) $$);

-- ---------- credentials bucket ----------
do $$
begin
  perform test.assert((select public from storage.buckets where id = 'credentials') = false, 'credentials bucket is private');
  perform test.assert((select file_size_limit from storage.buckets where id = 'credentials') = 5242880, 'size limit');
end $$;
select test.as_user('40000000-0000-0000-0000-0000000000b1');
select test.ok($$ insert into storage.objects (bucket_id, name, owner) values ('credentials', auth.uid()::text || '/degree.pdf', auth.uid()) $$);
select test.fails($$ insert into storage.objects (bucket_id, name, owner) values ('credentials', '40000000-0000-0000-0000-0000000000ff/degree.pdf', auth.uid()) $$, '42501');
select test.assert((select count(*) from storage.objects where bucket_id = 'credentials') = 1, 'owner reads their file');
select test.reset();
select test.as_user('40000000-0000-0000-0000-0000000000a1');                 -- a student
select test.fails($$ insert into storage.objects (bucket_id, name, owner) values ('credentials', auth.uid()::text || '/x.pdf', auth.uid()) $$, '42501');
select test.assert((select count(*) from storage.objects where bucket_id = 'credentials') = 0, 'a student sees no credentials');
select test.reset();
select test.as_user('40000000-0000-0000-0000-00000000000a');                 -- admin
select test.assert((select count(*) from storage.objects where bucket_id = 'credentials') = 1, 'admin can read credentials');
select test.reset();

rollback;
\o
\echo 'ALL DAY 4 TESTS PASSED'
