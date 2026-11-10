-- Tests for the Day 9 migration (courses, course_progress, peer network, course-assets). Rolled back at the end.
\o /dev/null
begin;
create function test.affected(p_sql text) returns integer language plpgsql as $$
declare n integer; begin execute p_sql; get diagnostics n = row_count; return n; end $$;
grant execute on function test.affected(text) to public;

insert into auth.users (id, email, raw_user_meta_data) values
  ('90000000-0000-0000-0000-00000000000a', 'admin@example.com', '{"name":"Alice Admin","date_of_birth":"1990-01-01"}'),
  ('90000000-0000-0000-0000-0000000000a1', 's1@example.com', '{"name":"Sam One","date_of_birth":"2000-01-01"}'),
  ('90000000-0000-0000-0000-0000000000a2', 's2@example.com', '{"name":"Sue Two","date_of_birth":"2001-05-05"}'),
  ('90000000-0000-0000-0000-0000000000a3', 's3@example.com', '{"name":"Tim Teen","date_of_birth":"2012-01-01","guardian_email":"g3@example.com"}'),
  ('90000000-0000-0000-0000-0000000000a4', 's4@example.com', '{"name":"Una Unconsented","date_of_birth":"2012-02-02","guardian_email":"g4@example.com"}'),
  ('90000000-0000-0000-0000-0000000000a5', 's5@example.com', '{"name":"Tia Teen","date_of_birth":"2011-03-03","guardian_email":"g5@example.com"}');
insert into auth.users (id, email, raw_user_meta_data)
  select '90000000-0000-0000-0000-0000000000b1', 'p1@example.com',
         jsonb_build_object('role','professional','name','Pat Pro','career_id', c.id::text) from public.careers c where c.name = 'Law';
update public.profiles set role_id = (select id from public.roles where name = 'admin') where id = '90000000-0000-0000-0000-00000000000a';

-- emulate guardian consent for the two teens that confirmed (the Edge Function does this for real)
update public.student_profiles set guardian_consent_at = now() where user_id in
  ('90000000-0000-0000-0000-0000000000a3', '90000000-0000-0000-0000-0000000000a5');
update public.profiles set is_active = true where id in
  ('90000000-0000-0000-0000-0000000000a3', '90000000-0000-0000-0000-0000000000a5');

insert into public.student_career_interests (student_id, career_id)
  select u.id, c.id from (values
    ('90000000-0000-0000-0000-0000000000a1'::uuid, 'Law'), ('90000000-0000-0000-0000-0000000000a1', 'Journalism & Media'),
    ('90000000-0000-0000-0000-0000000000a2', 'Law'),
    ('90000000-0000-0000-0000-0000000000a3', 'Law'),
    ('90000000-0000-0000-0000-0000000000a5', 'Law')) as u(id, cname)
  join public.careers c on c.name = u.cname;

-- ================= courses =================
select test.as_user('90000000-0000-0000-0000-00000000000a');
select test.ok($$ insert into public.courses (id, title, topic, content, estimated_minutes, is_published)
  values ('90000000-0000-0000-0000-00000000c001', '  Writing a CV  ', 'Careers', 'Hello', 20, true) $$);
select test.ok($$ insert into public.courses (id, title, topic, is_published)
  values ('90000000-0000-0000-0000-00000000c002', 'Draft course', 'Careers', false) $$);
select test.ok($$ update public.courses set asset_paths = array['90000000-0000-0000-0000-00000000c001/a.png']
  where id = '90000000-0000-0000-0000-00000000c001' $$);
select test.fails($$ update public.courses set asset_paths = array['someone-else/a.png']
  where id = '90000000-0000-0000-0000-00000000c001' $$, '22023');
select test.fails($$ update public.courses set asset_paths = array['90000000-0000-0000-0000-00000000c001/../x.png']
  where id = '90000000-0000-0000-0000-00000000c001' $$, '22023');
select test.fails($$ update public.courses set content = repeat('x', 20001) where id = '90000000-0000-0000-0000-00000000c001' $$, '22023');
select test.assert((select title from public.courses where id = '90000000-0000-0000-0000-00000000c001') = 'Writing a CV', 'title trimmed');
select test.assert((select count(*) from public.courses) = 2, 'admin sees draft and published');
select test.reset();

select test.as_user('90000000-0000-0000-0000-0000000000a1');
select test.assert((select count(*) from public.courses) = 1, 'student sees only the published course');
select test.fails($$ insert into public.courses (title) values ('hack') $$, '42501');
select test.assert(test.affected($$ update public.courses set title = 'hacked' $$) = 0, 'student cannot update');
select test.assert(test.affected($$ delete from public.courses $$) = 0, 'student cannot delete');
select test.reset();

select test.as_anon();
select test.fails($$ select * from public.courses $$, '42501');
select test.reset();

-- ================= progress =================
select test.as_user('90000000-0000-0000-0000-0000000000a1');
select test.ok($$ insert into public.course_progress (student_id, course_id) values (auth.uid(), '90000000-0000-0000-0000-00000000c001') $$);
select test.fails($$ insert into public.course_progress (student_id, course_id) values (auth.uid(), '90000000-0000-0000-0000-00000000c001') $$, '23505');
select test.fails($$ insert into public.course_progress (student_id, course_id) values (auth.uid(), '90000000-0000-0000-0000-00000000c002') $$, '42501');
select test.fails($$ insert into public.course_progress (student_id, course_id) values ('90000000-0000-0000-0000-0000000000a2', '90000000-0000-0000-0000-00000000c001') $$, '42501');
select test.fails($$ insert into public.course_progress (student_id, course_id, completed_at) values (auth.uid(), '90000000-0000-0000-0000-00000000c001', now() - interval '1 year') $$, '42501');
select test.fails($$ update public.course_progress set completed_at = now() - interval '9 days' $$, '42501');
select test.assert((select count(*) from public.course_progress) = 1, 'reads own progress');
select test.reset();

select test.as_user('90000000-0000-0000-0000-0000000000a2');
select test.assert((select count(*) from public.course_progress) = 0, 'student B cannot read student A progress');
select test.reset();
select test.as_user('90000000-0000-0000-0000-0000000000b1');
select test.fails($$ insert into public.course_progress (student_id, course_id) values (auth.uid(), '90000000-0000-0000-0000-00000000c001') $$, '42501');
select test.reset();
select test.as_user('90000000-0000-0000-0000-00000000000a');
select test.assert((select count(*) from public.course_progress) = 1, 'admin reads all progress');
select test.reset();

-- ================= storage policies (course-assets) =================
insert into storage.objects (bucket_id, name) values ('course-assets', '90000000-0000-0000-0000-00000000c001/a.png');
select test.as_user('90000000-0000-0000-0000-0000000000a1');
select test.fails($$ insert into storage.objects (bucket_id, name) values ('course-assets', 'x/y.png') $$, '42501');
select test.reset();
select test.as_user('90000000-0000-0000-0000-00000000000a');
select test.ok($$ insert into storage.objects (bucket_id, name) values ('course-assets', 'x/y.png') $$);
select test.assert((select count(*) from storage.objects where bucket_id = 'course-assets') = 2, 'admin reads the assets');
select test.reset();
do $$ begin
  perform test.assert((select public from storage.buckets where id = 'course-assets'), 'course-assets is public-read');
  perform test.assert((select file_size_limit from storage.buckets where id = 'course-assets') = 10485760, '10 MB limit');
end $$;

-- ================= peer directory =================
-- s1 (adult, Law+Media): sees adults only (s2), not minors, not self, not unconsented
select test.as_user('90000000-0000-0000-0000-0000000000a1');
select test.assert((select count(*) from public.peer_directory) = 1, 's1 sees exactly one adult peer');
select test.assert((select first_name from public.peer_directory) = 'Sue', 'first name only');
select test.assert((select shared_count from public.peer_directory) = 1, 'shared interests counted');
select test.fails($$ select date_of_birth from public.peer_directory $$, '42703');
-- other students' profiles are never readable: before Day 10 the table has no grant at all (42501),
-- from Day 10 on a student reads only their own row (at most 1)
do $$ declare n integer; begin
  begin select count(*) into n from public.student_profiles; exception when insufficient_privilege then n := 0; end;
  perform test.assert(n <= 1, 'a student never reads other students profiles');
end $$;
select test.reset();

-- s3 (minor, consented): sees the other consented minor only
select test.as_user('90000000-0000-0000-0000-0000000000a3');
select test.assert((select count(*) from public.peer_directory) = 1, 'minor sees one minor');
select test.assert((select first_name from public.peer_directory) = 'Tia', 'and it is Tia');
select test.reset();

-- professional, admin and anon: nothing
select test.as_user('90000000-0000-0000-0000-0000000000b1');
select test.assert((select count(*) from public.peer_directory) = 0, 'professional sees no peers');
select test.fails($$ insert into public.peer_connections (requester_id, recipient_id) values (auth.uid(), '90000000-0000-0000-0000-0000000000a1') $$);
select test.reset();
select test.as_anon();
select test.fails($$ select * from public.peer_directory $$, '42501');
select test.reset();

-- ================= connections =================
select test.as_user('90000000-0000-0000-0000-0000000000a1');
select test.ok($$ insert into public.peer_connections (requester_id, recipient_id) values (auth.uid(), '90000000-0000-0000-0000-0000000000a2') $$);
select test.fails($$ insert into public.peer_connections (requester_id, recipient_id) values (auth.uid(), '90000000-0000-0000-0000-0000000000a2') $$, '23505');
select test.fails($$ insert into public.peer_connections (requester_id, recipient_id) values (auth.uid(), '90000000-0000-0000-0000-0000000000a3') $$, '23514');   -- minor
select test.fails($$ insert into public.peer_connections (requester_id, recipient_id) values (auth.uid(), '90000000-0000-0000-0000-0000000000a4') $$, '23514');   -- not consented
select test.fails($$ insert into public.peer_connections (requester_id, recipient_id) values (auth.uid(), auth.uid()) $$);                                      -- self
select test.fails($$ insert into public.peer_connections (requester_id, recipient_id) values ('90000000-0000-0000-0000-0000000000a2', auth.uid()) $$); -- as someone else
select test.fails($$ insert into public.peer_connections (requester_id, recipient_id, status) values (auth.uid(), '90000000-0000-0000-0000-0000000000a2', 'connected') $$, '42501'); -- column grant
select test.assert((select count(*) from public.my_peer_connections where direction = 'sent' and other_first_name = 'Sue') = 1, 'requester sees the sent request');
select test.assert(test.affected($$ update public.peer_connections set status = 'connected' $$) = 0, 'requester cannot answer own request');
select test.reset();

select test.as_user('90000000-0000-0000-0000-0000000000a2');
select test.assert((select count(*) from public.my_peer_connections where direction = 'received' and other_first_name = 'Sam') = 1, 'recipient sees the received request');
select test.fails($$ insert into public.peer_connections (requester_id, recipient_id) values (auth.uid(), '90000000-0000-0000-0000-0000000000a1') $$, '23505'); -- reverse pair
select test.fails($$ update public.peer_connections set requester_id = auth.uid() $$, '42501');                  -- column grant
select test.fails($$ update public.peer_connections set status = 'pending' $$, '23514');
select test.ok($$ update public.peer_connections set status = 'connected' $$);
select test.assert(test.affected($$ update public.peer_connections set status = 'declined' $$) = 0, 'an answered request cannot be changed again');
select test.reset();

-- both sides now see the connection
select test.as_user('90000000-0000-0000-0000-0000000000a1');
select test.assert((select status from public.my_peer_connections where other_first_name = 'Sue') = 'connected', 'requester sees connected');
select test.reset();

-- notifications: a request notified the recipient, the acceptance notified the requester
do $$ begin
  perform test.assert((select count(*) from public.notifications where type = 'peer_request' and user_id = '90000000-0000-0000-0000-0000000000a2'
                        and payload ->> 'name' = 'Sam') = 1, 'recipient notified');
  perform test.assert((select count(*) from public.notifications where type = 'peer_connected' and user_id = '90000000-0000-0000-0000-0000000000a1'
                        and payload ->> 'name' = 'Sue') = 1, 'requester notified of acceptance');
end $$;

-- a third student sees none of it; admin sees all rows
select test.as_user('90000000-0000-0000-0000-0000000000a3');
select test.assert((select count(*) from public.peer_connections) = 0, 'outsider reads no connections');
select test.assert((select count(*) from public.my_peer_connections) = 0, 'and none through the view');
select test.reset();
select test.as_user('90000000-0000-0000-0000-00000000000a');
select test.assert((select count(*) from public.peer_connections) = 1, 'admin reads connections');
select test.reset();

-- minors connect with minors
select test.as_user('90000000-0000-0000-0000-0000000000a3');
select test.ok($$ insert into public.peer_connections (requester_id, recipient_id) values (auth.uid(), '90000000-0000-0000-0000-0000000000a5') $$);
select test.reset();
select test.as_user('90000000-0000-0000-0000-0000000000a5');
select test.ok($$ update public.peer_connections set status = 'declined' where requester_id = '90000000-0000-0000-0000-0000000000a3' $$);
select test.reset();

-- the 30-pending-requests cap
do $$
begin
  insert into auth.users (id, email, raw_user_meta_data)
  select ('91000000-0000-0000-0000-' || lpad(g::text, 12, '0'))::uuid, 'bulk' || g || '@example.com',
         '{"name":"Bulk","date_of_birth":"1999-01-01"}'::jsonb
  from generate_series(1, 31) g;
end $$;
select test.as_user('90000000-0000-0000-0000-0000000000a2');
do $$
declare i int;
begin
  for i in 1..30 loop
    insert into public.peer_connections (requester_id, recipient_id)
    values (auth.uid(), ('91000000-0000-0000-0000-' || lpad(i::text, 12, '0'))::uuid);
  end loop;
end $$;
select test.fails($$ insert into public.peer_connections (requester_id, recipient_id)
  values (auth.uid(), '91000000-0000-0000-0000-000000000031') $$, '23514');
select test.reset();

rollback;
\o
\echo ALL DAY 9 TESTS PASSED
