-- Tests for the Day 10 migration (settings, notification prefs, reminders, admin stats). Rolled back at the end.
\o /dev/null
begin;
create function test.affected(p_sql text) returns integer language plpgsql as $$
declare n integer; begin execute p_sql; get diagnostics n = row_count; return n; end $$;
grant execute on function test.affected(text) to public;

insert into auth.users (id, email, raw_user_meta_data) values
  ('a0000000-0000-0000-0000-00000000000a', 'admin@example.com', '{"name":"Alice Admin","date_of_birth":"1990-01-01"}'),
  ('a0000000-0000-0000-0000-0000000000a1', 's1@example.com', '{"name":"Sam One","date_of_birth":"2000-01-01"}'),
  ('a0000000-0000-0000-0000-0000000000a2', 's2@example.com', '{"name":"Sue Two","date_of_birth":"2001-05-05"}'),
  ('a0000000-0000-0000-0000-0000000000a3', 's3@example.com', '{"name":"Tim Teen","date_of_birth":"2012-01-01","guardian_email":"g3@example.com"}');
insert into auth.users (id, email, raw_user_meta_data)
  select 'a0000000-0000-0000-0000-0000000000b1', 'p1@example.com',
         jsonb_build_object('role','professional','name','Pat Pro','career_id', c.id::text) from public.careers c where c.name = 'Law';
update public.profiles set role_id = (select id from public.roles where name = 'admin') where id = 'a0000000-0000-0000-0000-00000000000a';

insert into public.careers (name) values ('Extra A'), ('Extra B'), ('Extra C');

-- ================= own profile =================
select test.as_user('a0000000-0000-0000-0000-0000000000a1');
select test.ok($$ update public.profiles set name = 'Samuel One' where id = auth.uid() $$);
select test.assert((select name from public.profiles where id = auth.uid()) = 'Samuel One', 'own name changed');
select test.fails($$ update public.profiles set name = '' where id = auth.uid() $$);
select test.fails($$ update public.profiles set role_id = (select id from public.roles where name = 'admin') where id = auth.uid() $$, '42501');
select test.fails($$ update public.profiles set is_active = false where id = auth.uid() $$, '42501');
select test.assert(test.affected($$ update public.profiles set name = 'Hacked' where id = 'a0000000-0000-0000-0000-0000000000a2' $$) = 0, 'cannot rename another user');
select test.reset();
select test.as_user('a0000000-0000-0000-0000-0000000000b1');
select test.ok($$ update public.profiles set name = 'Patricia Pro' where id = auth.uid() $$);
select test.reset();
-- renaming yourself is not an admin action: nothing in the activity log
do $$ begin perform test.assert((select count(*) from public.admin_activity_log where action = 'user.rename') = 0, 'self rename not logged'); end $$;

-- ================= student settings =================
select test.as_user('a0000000-0000-0000-0000-0000000000a1');
select test.assert((select count(*) from public.student_profiles) = 1, 'student reads only their own student profile');
select test.assert((select count(*) from public.student_career_interests) = 0, 'no interests yet');
select test.fails($$ update public.student_profiles set bio = 'direct' $$, '42501');
select test.fails($$ insert into public.student_career_interests (student_id, career_id) select auth.uid(), id from public.careers limit 1 $$, '42501');
select test.ok($$ select public.update_my_student_settings('I like law', (select array_agg(id) from (select id from public.careers where name in ('Law','Journalism & Media')) x), '{"messages": false, "peers": true}'::jsonb) $$);
select test.assert((select bio from public.student_profiles) = 'I like law', 'bio saved');
select test.assert((select count(*) from public.student_career_interests) = 2, 'two interests');
select test.assert((select (notification_prefs ->> 'messages') from public.student_profiles) = 'false', 'prefs saved');
-- replacing the interests removes the old ones
select test.ok($$ select public.update_my_student_settings('I like law', (select array_agg(id) from public.careers where name = 'Law'), null) $$);
select test.assert((select count(*) from public.student_career_interests) = 1, 'one interest left');
select test.assert((select (notification_prefs ->> 'messages') from public.student_profiles) = 'false', 'null prefs keep the old ones');
select test.fails($$ select public.update_my_student_settings(repeat('x', 1001), '{}', null) $$, '22023');
select test.fails($$ select public.update_my_student_settings('x', array['a0000000-0000-0000-0000-00000000dead'::uuid], null) $$, '22023');
select test.fails($$ select public.update_my_student_settings('x', '{}', '{"unknown": true}'::jsonb) $$, '22023');
select test.fails($$ select public.update_my_student_settings('x', '{}', '{"messages": "no"}'::jsonb) $$, '22023');
select test.fails($$ select public.update_my_student_settings('x', (select array_agg(id) from (select id from public.careers limit 11) y), null) $$, '22023');
select test.reset();
select test.as_user('a0000000-0000-0000-0000-0000000000a2');
select test.assert((select count(*) from public.student_career_interests) = 0, 'student B does not see student A interests');
select test.assert((select bio from public.student_profiles) is null, 'student B has their own row only');
select test.reset();
select test.as_user('a0000000-0000-0000-0000-0000000000b1');
select test.fails($$ select public.update_my_student_settings('x', '{}', null) $$, '42501');
select test.assert((select count(*) from public.student_profiles) = 0, 'professional reads no student profile');
select test.reset();
select test.as_anon();
select test.fails($$ select public.update_my_student_settings('x', '{}', null) $$, '42501');
select test.reset();
select test.as_user('a0000000-0000-0000-0000-00000000000a');
select test.assert((select count(*) from public.student_profiles) >= 3, 'admin reads all student profiles');
select test.fails($$ select public.update_my_student_settings('x', '{}', null) $$, '42501');
select test.reset();

-- ================= notify honours preferences =================
-- s1 switched "messages" off; peers stay on
do $$ begin
  perform public.notify('a0000000-0000-0000-0000-0000000000a1', 'new_message', '{}');
  perform public.notify('a0000000-0000-0000-0000-0000000000a1', 'peer_request', '{}');
  perform public.notify('a0000000-0000-0000-0000-0000000000a1', 'request_accepted', '{}');
  perform public.notify('a0000000-0000-0000-0000-0000000000a2', 'new_message', '{}');
  perform test.assert((select count(*) from public.notifications where user_id = 'a0000000-0000-0000-0000-0000000000a1' and type = 'new_message') = 0, 'switched-off category is not delivered');
  perform test.assert((select count(*) from public.notifications where user_id = 'a0000000-0000-0000-0000-0000000000a1' and type = 'peer_request') = 1, 'other categories are');
  perform test.assert((select count(*) from public.notifications where user_id = 'a0000000-0000-0000-0000-0000000000a1' and type = 'request_accepted') = 1, 'important notifications are always delivered');
  perform test.assert((select count(*) from public.notifications where user_id = 'a0000000-0000-0000-0000-0000000000a2' and type = 'new_message') = 1, 'default is on');
end $$;

-- ================= reminders =================
update public.profiles set is_active = true where id = 'a0000000-0000-0000-0000-0000000000b1';
update public.professional_profiles set verification_status = 'verified' where user_id = 'a0000000-0000-0000-0000-0000000000b1';
insert into public.availability_slots (id, professional_id, start_time, end_time, status) values
  ('a0000000-0000-0000-0000-00000000e001', 'a0000000-0000-0000-0000-0000000000b1', now() + interval '3 hours', now() + interval '4 hours', 'open'),
  ('a0000000-0000-0000-0000-00000000e002', 'a0000000-0000-0000-0000-0000000000b1', now() + interval '3 days', now() + interval '3 days 1 hour', 'open'),
  ('a0000000-0000-0000-0000-00000000e003', 'a0000000-0000-0000-0000-0000000000b1', now() + interval '10 hours', now() + interval '11 hours', 'open');
insert into public.mentorship_requests (id, student_id, professional_id, availability_slot_id, status) values
  ('a0000000-0000-0000-0000-00000000f001', 'a0000000-0000-0000-0000-0000000000a2', 'a0000000-0000-0000-0000-0000000000b1', 'a0000000-0000-0000-0000-00000000e001', 'accepted'),
  ('a0000000-0000-0000-0000-00000000f002', 'a0000000-0000-0000-0000-0000000000a2', 'a0000000-0000-0000-0000-0000000000b1', 'a0000000-0000-0000-0000-00000000e002', 'accepted'),
  ('a0000000-0000-0000-0000-00000000f003', 'a0000000-0000-0000-0000-0000000000a1', 'a0000000-0000-0000-0000-0000000000b1', 'a0000000-0000-0000-0000-00000000e003', 'pending');
delete from public.notifications;
do $$ begin
  perform test.assert(public.send_session_reminders() = 1, 'one session is within 24 hours and accepted');
  perform test.assert((select count(*) from public.notifications where type = 'session_reminder') = 2, 'student and professional both reminded');
  perform test.assert((select count(*) from public.notifications where type = 'session_reminder' and user_id = 'a0000000-0000-0000-0000-0000000000a2') = 1, 'student reminded');
  perform test.assert((select payload ->> 'professional_name' from public.notifications where type = 'session_reminder' and user_id = 'a0000000-0000-0000-0000-0000000000a2') = 'Patricia Pro', 'payload carries the name');
  perform test.assert(public.send_session_reminders() = 0, 'never twice');
  perform test.assert((select reminder_sent_at is not null from public.mentorship_requests where id = 'a0000000-0000-0000-0000-00000000f001'), 'marked as sent');
  perform test.assert((select reminder_sent_at is null from public.mentorship_requests where id = 'a0000000-0000-0000-0000-00000000f002'), 'later session untouched');
end $$;
select test.as_user('a0000000-0000-0000-0000-0000000000a2');
select test.fails($$ select public.send_session_reminders() $$, '42501');
select test.reset();
select test.as_user('a0000000-0000-0000-0000-00000000000a');
select test.fails($$ select public.send_session_reminders() $$, '42501');
select test.reset();

-- ================= admin stats =================
select test.as_user('a0000000-0000-0000-0000-00000000000a');
select test.assert((select students from public.admin_stats()) = 2, 'two active students (the minor awaits consent)');
select test.assert((select professionals from public.admin_stats()) = 1, 'one professional');
select test.assert((select admins from public.admin_stats()) = 1, 'one admin');
select test.assert((select awaiting_consent from public.admin_stats()) = 1, 'one student awaiting consent');
select test.assert((select upcoming_sessions from public.admin_stats()) = 2, 'two upcoming accepted sessions');
select test.assert((select pending_requests from public.admin_stats()) = 1, 'one pending request');
select test.assert((select count(*) from public.admin_signups_by_day(7)) = 7, 'seven days returned');
select test.assert((select sum(students + professionals) from public.admin_signups_by_day(7)) = 4, 'sign-ups counted by role (3 students + 1 pro; admin excluded)');
select test.reset();
do $$ declare u text; begin
  foreach u in array array['a0000000-0000-0000-0000-0000000000a1','a0000000-0000-0000-0000-0000000000b1'] loop
    perform test.as_user(u::uuid);
    perform test.fails('select * from public.admin_stats()', '42501');
    perform test.fails('select * from public.admin_signups_by_day(7)', '42501');
    perform test.fails('select * from public.admin_list_students()', '42501');
    perform test.reset();
  end loop;
end $$;
select test.as_anon();
select test.fails($$ select * from public.admin_stats() $$, '42501');
select test.reset();

-- ================= admin_list_students =================
select test.as_user('a0000000-0000-0000-0000-00000000000a');
select test.assert((select count(*) from public.admin_list_students()) = 3, 'three students listed');
select test.assert((select total_count from public.admin_list_students(null, null, 1, 2) limit 1) = 3, 'total_count counts all pages');
select test.assert((select count(*) from public.admin_list_students(null, null, 1, 2)) = 2, 'page size respected');
select test.assert((select count(*) from public.admin_list_students(null, 'awaiting_consent')) = 1, 'awaiting consent filter');
select test.assert((select name from public.admin_list_students('tim')) = 'Tim Teen', 'search by name');
select test.assert((select is_minor from public.admin_list_students('tim')), 'minor flag');
select test.assert((select consent_status from public.admin_list_students('tim')) = 'awaiting', 'consent awaiting');
select test.assert((select consent_status from public.admin_list_students('sue')) = 'not_needed', 'adult needs no consent');
select test.assert((select sessions_count from public.admin_list_students('sue')) = 2, 'sessions counted');
select test.fails($$ select * from public.admin_list_students(null, 'weird') $$, '22023');
select test.reset();

-- ================= course audit trail =================
select test.as_user('a0000000-0000-0000-0000-00000000000a');
select test.ok($$ insert into public.courses (id, title, is_published) values ('a0000000-0000-0000-0000-00000000c001', 'Study skills', false) $$);
select test.ok($$ update public.courses set is_published = true where id = 'a0000000-0000-0000-0000-00000000c001' $$);
select test.ok($$ update public.courses set title = 'Study skills 101' where id = 'a0000000-0000-0000-0000-00000000c001' $$);
select test.ok($$ update public.courses set asset_paths = array['a0000000-0000-0000-0000-00000000c001/a.png'] where id = 'a0000000-0000-0000-0000-00000000c001' $$);
select test.ok($$ delete from public.courses where id = 'a0000000-0000-0000-0000-00000000c001' $$);
select test.assert((select array_agg(action order by created_at, action) from public.admin_activity_log where action like 'course.%') @> array['course.create','course.publish','course.update','course.delete'], 'course changes logged');
select test.assert((select count(*) from public.admin_activity_log where action like 'course.%') = 4, 'asset-only change is not logged');
select test.reset();

-- ================= the audit trail stays append-only =================
select test.as_user('a0000000-0000-0000-0000-00000000000a');
select test.fails($$ update public.admin_activity_log set action = 'x' $$, '42501');
select test.fails($$ delete from public.admin_activity_log $$, '42501');
select test.fails($$ insert into public.admin_activity_log (action) values ('forged') $$, '42501');
select test.reset();

rollback;
\o
\echo ALL DAY 10 TESTS PASSED
