-- Tests for the Day 5 migration (availability, discovery, requesting). Rolled back at the end.
\o /dev/null
begin;

-- ---------- fixtures ----------
-- admin, verified pro (P1), unverified pro (P2), students S1 + S2, a student that is inactive (S3)
insert into auth.users (id, email, raw_user_meta_data) values
  ('50000000-0000-0000-0000-00000000000a', 'admin@example.com', '{"name":"Alice Admin","date_of_birth":"1990-01-01"}'),
  ('50000000-0000-0000-0000-0000000000a1', 's1@example.com',    '{"name":"Sam One","date_of_birth":"2000-01-01"}'),
  ('50000000-0000-0000-0000-0000000000a2', 's2@example.com',    '{"name":"Sue Two","date_of_birth":"2000-01-01"}'),
  ('50000000-0000-0000-0000-0000000000a3', 's3@example.com',    '{"name":"Ina Inactive","date_of_birth":"2000-01-01"}');
insert into auth.users (id, email, raw_user_meta_data)
  select '50000000-0000-0000-0000-0000000000b1', 'p1@example.com',
         jsonb_build_object('role','professional','name','Pat Verified','career_id', c.id::text, 'bio', 'Lawyer for 10 years', 'experience_years', '10')
  from public.careers c where c.name = 'Law';
insert into auth.users (id, email, raw_user_meta_data)
  select '50000000-0000-0000-0000-0000000000b2', 'p2@example.com',
         jsonb_build_object('role','professional','name','Una Unverified','career_id', c.id::text)
  from public.careers c where c.name = 'Law';
update public.profiles set role_id = (select id from public.roles where name = 'admin') where id = '50000000-0000-0000-0000-00000000000a';
update public.profiles set is_active = false where id = '50000000-0000-0000-0000-0000000000a3';
update public.professional_profiles set verification_status = 'verified', verified_at = now() where user_id = '50000000-0000-0000-0000-0000000000b1';

-- ---------- slots: who can add what ----------
select test.as_user('50000000-0000-0000-0000-0000000000b2');                       -- unverified pro
select test.fails($$ insert into public.availability_slots (professional_id, start_time, end_time)
                     values (auth.uid(), now() + interval '2 days', now() + interval '2 days 1 hour') $$, '42501');
select test.reset();

select test.as_user('50000000-0000-0000-0000-0000000000a1');                       -- student
select test.fails($$ insert into public.availability_slots (professional_id, start_time, end_time)
                     values (auth.uid(), now() + interval '2 days', now() + interval '2 days 1 hour') $$, '42501');
select test.reset();

select test.as_user('50000000-0000-0000-0000-0000000000b1');                       -- verified pro
select test.ok($$ insert into public.availability_slots (professional_id, start_time, end_time, meeting_url)
                  values (auth.uid(), date_trunc('hour', now()) + interval '2 days', date_trunc('hour', now()) + interval '2 days 1 hour', 'https://meet.example.com/pat') $$);
select test.ok($$ insert into public.availability_slots (professional_id, start_time, end_time)
                  values (auth.uid(), date_trunc('hour', now()) + interval '3 days', date_trunc('hour', now()) + interval '3 days 1 hour') $$);
-- someone else's id
select test.fails($$ insert into public.availability_slots (professional_id, start_time, end_time)
                     values ('50000000-0000-0000-0000-0000000000b2', now() + interval '4 days', now() + interval '4 days 1 hour') $$, '42501');
-- past slot, overlap, bad link, status injection, end before start
select test.fails($$ insert into public.availability_slots (professional_id, start_time, end_time)
                     values (auth.uid(), now() - interval '1 hour', now() + interval '1 hour') $$, '22023');
select test.fails($$ insert into public.availability_slots (professional_id, start_time, end_time)
                     values (auth.uid(), date_trunc('hour', now()) + interval '2 days 30 minutes', date_trunc('hour', now()) + interval '2 days 90 minutes') $$, '23P01');
select test.fails($$ insert into public.availability_slots (professional_id, start_time, end_time, meeting_url)
                     values (auth.uid(), now() + interval '5 days', now() + interval '5 days 1 hour', 'javascript:alert(1)') $$, '22023');
select test.fails($$ insert into public.availability_slots (professional_id, start_time, end_time, status)
                     values (auth.uid(), now() + interval '6 days', now() + interval '6 days 1 hour', 'booked') $$, '42501');
select test.fails($$ insert into public.availability_slots (professional_id, start_time, end_time)
                     values (auth.uid(), now() + interval '7 days', now() + interval '7 days') $$, '23514');
select test.reset();

-- ---------- slots: who can read what, and the meeting link ----------
select test.as_user('50000000-0000-0000-0000-0000000000a1');                       -- student S1
select test.assert((select count(*) from public.availability_slots) = 2, 'a student sees the 2 open slots of the verified pro');
select test.fails($$ select meeting_url from public.availability_slots $$, '42501');
select test.fails($$ select * from public.availability_slots $$, '42501');
select test.assert((select count(*) from public.slot_links) = 0, 'a student sees no meeting link before acceptance');
do $$
declare n int;
begin
  update public.availability_slots set start_time = start_time + interval '1 hour';
  get diagnostics n = row_count;
  perform test.assert(n = 0, 'a student cannot edit any slot');
end $$;
select test.reset();

select test.as_user('50000000-0000-0000-0000-0000000000b1');                       -- owner
select test.assert((select count(*) from public.slot_links) = 1, 'the owner sees their own meeting link');
select test.reset();
select test.as_user('50000000-0000-0000-0000-00000000000a');                       -- admin
select test.assert((select count(*) from public.slot_links) = 1, 'admin sees meeting links');
select test.assert((select count(*) from public.availability_slots) = 2, 'admin sees all slots');
select test.reset();
select test.as_user('50000000-0000-0000-0000-0000000000a3');                       -- inactive student
select test.assert((select count(*) from public.availability_slots) = 0, 'an inactive account sees no slots');
select test.assert((select count(*) from public.public_professionals) = 0, 'an inactive account sees no professionals');
select test.reset();
select test.as_anon();
select test.fails($$ select * from public.availability_slots $$, '42501');
select test.fails($$ select * from public.public_professionals $$, '42501');
select test.reset();

-- a slot of an unverified professional is invisible to students (admin adds one for them)
select test.as_user('50000000-0000-0000-0000-00000000000a');
select test.fails($$ insert into public.availability_slots (professional_id, start_time, end_time)
                     values ('50000000-0000-0000-0000-0000000000b2', now() + interval '8 days', now() + interval '8 days 1 hour') $$, '42501');   -- not verified
select test.ok($$ insert into public.availability_slots (professional_id, start_time, end_time, meeting_url)
                  values ('50000000-0000-0000-0000-0000000000b1', date_trunc('hour', now()) + interval '9 days', date_trunc('hour', now()) + interval '9 days 1 hour', 'https://meet.example.com/admin-added') $$);
select test.reset();

-- ---------- views ----------
select test.as_user('50000000-0000-0000-0000-0000000000a1');
do $$
declare r record;
begin
  perform test.assert((select count(*) from public.public_professionals) = 1, 'only the verified professional is listed');
  select * into r from public.public_professionals;
  perform test.assert(r.name = 'Pat Verified' and r.career_name = 'Law' and r.experience_years = 10, 'public_professionals columns');
  perform test.assert(r.next_open_slot is not null, 'next open slot is shown');
  perform test.assert((select professional_count from public.career_directory where name = 'Law') = 1, 'career_directory counts verified pros');
  perform test.assert((select professional_count from public.career_directory where name = 'Medicine & Healthcare') = 0, 'zero for an empty career');
  perform test.assert((select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'public_professionals'
                         and column_name in ('email', 'credentials_path', 'verification_status')) = 0, 'no sensitive columns in the view');
end $$;
select test.reset();

-- ---------- request_session ----------
select test.as_user('50000000-0000-0000-0000-0000000000a1');                       -- S1
do $$
declare
  v_slot uuid := (select id from public.availability_slots order by start_time limit 1);
  v_req  uuid;
begin
  v_req := public.request_session(v_slot, '  Hello, I want to learn about law.  ');
  perform test.assert(v_req is not null, 'request created');
  perform test.assert((select message from public.mentorship_requests where id = v_req) = 'Hello, I want to learn about law.', 'message trimmed');
  perform test.assert((select professional_id from public.mentorship_requests where id = v_req) = '50000000-0000-0000-0000-0000000000b1', 'professional taken from the slot');
end $$;
select test.fails($$ select public.request_session((select id from public.availability_slots order by start_time limit 1)) $$, '23505');   -- duplicate pending
select test.fails($$ select public.request_session('50000000-0000-0000-0000-00000000ffff') $$, 'P0002');
select test.fails($$ select public.request_session((select id from public.availability_slots order by start_time limit 1), repeat('x', 1001)) $$, '22023');
select test.fails($$ insert into public.mentorship_requests (student_id, professional_id, availability_slot_id)
                     values (auth.uid(), '50000000-0000-0000-0000-0000000000b1', (select id from public.availability_slots limit 1)) $$, '42501');
select test.reset();

select test.as_user('50000000-0000-0000-0000-0000000000b1');                       -- a professional cannot request
select test.fails($$ select public.request_session((select id from public.availability_slots order by start_time limit 1)) $$, '42501');
select test.reset();
select test.as_user('50000000-0000-0000-0000-0000000000a3');                       -- inactive student cannot request
select test.fails($$ select public.request_session('50000000-0000-0000-0000-00000000ffff') $$, '42501');
select test.reset();
select test.as_anon();
select test.fails($$ select public.request_session('50000000-0000-0000-0000-00000000ffff') $$, '42501');
select test.reset();

-- the 10-pending-requests cap
insert into public.availability_slots (professional_id, start_time, end_time)
  select '50000000-0000-0000-0000-0000000000b1', date_trunc('hour', now()) + interval '20 days' + (g || ' hours')::interval, date_trunc('hour', now()) + interval '20 days 30 minutes' + (g || ' hours')::interval
  from generate_series(1, 12) g;
select test.as_user('50000000-0000-0000-0000-0000000000a2');
do $$
declare s record; n int := 0;
begin
  for s in select id from public.availability_slots where start_time > now() + interval '19 days' order by start_time loop
    n := n + 1;
    if n <= 10 then perform public.request_session(s.id);
    else
      begin
        perform public.request_session(s.id);
        raise exception 'the 11th pending request was accepted';
      exception when check_violation then null; end;
      exit;
    end if;
  end loop;
end $$;
select test.reset();
delete from public.mentorship_requests where student_id = '50000000-0000-0000-0000-0000000000a2';
delete from public.availability_slots where start_time > now() + interval '19 days' and start_time < now() + interval '21 days';

-- ---------- who reads requests / profiles ----------
select test.as_user('50000000-0000-0000-0000-0000000000a1');
do $$
begin
  perform test.assert((select count(*) from public.mentorship_requests) = 1, 'S1 sees own request');
  perform test.assert((select count(*) from public.profiles where id = '50000000-0000-0000-0000-0000000000b1') = 1, 'S1 can read the mentor profile (other party)');
  perform test.assert((select count(*) from public.profiles where id = '50000000-0000-0000-0000-0000000000a2') = 0, 'S1 cannot read an unrelated student');
  perform test.assert((select count(*) from public.profiles where id = '50000000-0000-0000-0000-0000000000b2') = 0, 'S1 cannot read an unrelated professional');
end $$;
select test.reset();
select test.as_user('50000000-0000-0000-0000-0000000000a2');
select test.assert((select count(*) from public.mentorship_requests) = 0, 'S2 does not see S1 requests');
select test.assert((select count(*) from public.profiles where id = '50000000-0000-0000-0000-0000000000a1') = 0, 'S2 cannot read S1');
select test.reset();
select test.as_user('50000000-0000-0000-0000-0000000000b1');
do $$
begin
  perform test.assert((select count(*) from public.mentorship_requests) = 1, 'the professional sees the request');
  perform test.assert((select count(*) from public.profiles where id = '50000000-0000-0000-0000-0000000000a1') = 1, 'the professional can read the student name');
end $$;
select test.reset();
select test.as_user('50000000-0000-0000-0000-0000000000b2');
select test.assert((select count(*) from public.mentorship_requests) = 0, 'an unrelated professional sees nothing');
select test.reset();
select test.as_user('50000000-0000-0000-0000-00000000000a');
select test.assert((select count(*) from public.mentorship_requests) = 1, 'admin sees all requests');
select test.reset();

-- ---------- editing slots ----------
select test.as_user('50000000-0000-0000-0000-0000000000b1');
do $$
declare n int; v_slot uuid := (select id from public.availability_slots where professional_id = auth.uid() order by start_time limit 1);
begin
  update public.availability_slots set meeting_url = 'https://meet.example.com/new' where id = v_slot;
  get diagnostics n = row_count;
  perform test.assert(n = 1, 'owner edits an open slot');
  perform test.assert((select meeting_url from public.slot_links where slot_id = v_slot) = 'https://meet.example.com/new', 'new link visible to the owner');
end $$;
select test.fails($$ update public.availability_slots set start_time = now() - interval '1 day', end_time = now() - interval '23 hours' where professional_id = auth.uid() $$, '22023');
select test.fails($$ update public.availability_slots set status = 'booked' where professional_id = auth.uid() $$, '42501');                -- no column grant
select test.fails($$ update public.availability_slots set professional_id = '50000000-0000-0000-0000-0000000000b2' where professional_id = auth.uid() $$, '42501');
select test.reset();

-- ---------- removing slots ----------
-- (a) owner deletes an open slot that has a pending request: request declined, slot kept as 'cancelled'
select test.as_user('50000000-0000-0000-0000-0000000000b1');
do $$
declare v_slot uuid := (select availability_slot_id from public.mentorship_requests limit 1);
begin
  perform test.assert(public.delete_open_slot(v_slot) = 'cancelled', 'slot with history is kept as cancelled');
  perform test.assert((select status from public.availability_slots where id = v_slot) = 'cancelled', 'slot cancelled');
  perform test.assert((select status from public.mentorship_requests where availability_slot_id = v_slot) = 'declined', 'pending request declined');
  perform test.assert((select decline_reason from public.mentorship_requests where availability_slot_id = v_slot) = 'The mentor removed this slot', 'decline reason');
end $$;
-- (b) a slot with no requests is really deleted
do $$
declare v_slot uuid := (select id from public.availability_slots where status = 'open' and professional_id = auth.uid() order by start_time limit 1);
begin
  perform test.assert(public.delete_open_slot(v_slot) = 'deleted', 'a slot nobody requested is deleted');
  perform test.assert(not exists (select 1 from public.availability_slots where id = v_slot), 'row is gone');
end $$;
select test.fails($$ select public.delete_open_slot('50000000-0000-0000-0000-00000000ffff') $$, 'P0002');
select test.reset();

-- (c) admin deletes a booked slot: the accepted request is cancelled, action logged
do $$
declare v_slot uuid; v_req uuid;
begin
  insert into public.availability_slots (professional_id, start_time, end_time, meeting_url)
    values ('50000000-0000-0000-0000-0000000000b1', now() + interval '30 days', now() + interval '30 days 1 hour', 'https://meet.example.com/booked')
    returning id into v_slot;
  insert into public.mentorship_requests (student_id, professional_id, availability_slot_id, status, decided_at)
    values ('50000000-0000-0000-0000-0000000000a1', '50000000-0000-0000-0000-0000000000b1', v_slot, 'accepted', now())
    returning id into v_req;
  perform set_config('nexa.slot_system_write', 'on', true);
  update public.availability_slots set status = 'booked' where id = v_slot;
  perform set_config('nexa.slot_system_write', 'off', true);
  perform set_config('test.slot', v_slot::text, true);
  perform set_config('test.req', v_req::text, true);
end $$;
-- the accepted student can now read the meeting link, an unrelated student cannot
select test.as_user('50000000-0000-0000-0000-0000000000a1');
select test.assert((select meeting_url from public.slot_links where slot_id = current_setting('test.slot')::uuid) = 'https://meet.example.com/booked', 'accepted student sees the link');
select test.assert((select status from public.availability_slots where id = current_setting('test.slot')::uuid) = 'booked', 'accepted student can read the booked slot');
select test.reset();
select test.as_user('50000000-0000-0000-0000-0000000000a2');
select test.assert((select count(*) from public.slot_links) = 0, 'unrelated student sees no link');
select test.reset();
-- a booked slot cannot be edited by its owner, or have its time changed by an admin; the admin may fix the link
select test.as_user('50000000-0000-0000-0000-0000000000b1');
do $$
declare n int;
begin
  update public.availability_slots set meeting_url = 'https://x.example.com' where id = current_setting('test.slot')::uuid;
  get diagnostics n = row_count;
  perform test.assert(n = 0, 'owner cannot edit a booked slot');
  begin
    perform public.delete_open_slot(current_setting('test.slot')::uuid);
    raise exception 'owner deleted a booked slot';
  exception when check_violation then null; end;
end $$;
select test.reset();
select test.as_user('50000000-0000-0000-0000-00000000000a');
select test.fails($$ update public.availability_slots set start_time = start_time + interval '1 day', end_time = end_time + interval '1 day' where id = current_setting('test.slot')::uuid $$, '23514');
select test.ok($$ update public.availability_slots set meeting_url = 'https://meet.example.com/fixed' where id = current_setting('test.slot')::uuid $$);
select test.fails($$ select public.admin_delete_slot('50000000-0000-0000-0000-00000000ffff') $$, 'P0002');
select test.assert(public.admin_delete_slot(current_setting('test.slot')::uuid) = 'cancelled', 'admin delete of a booked slot');
select test.reset();
do $$
begin
  perform test.assert((select status from public.mentorship_requests where id = current_setting('test.req')::uuid) = 'cancelled', 'accepted request cancelled');
  perform test.assert((select cancelled_at from public.mentorship_requests where id = current_setting('test.req')::uuid) is not null, 'cancelled_at set');
  perform test.assert((select count(*) from public.admin_activity_log where action = 'slot.delete') = 1, 'slot.delete logged');
  perform test.assert((select details -> 'affected_requests' -> 0 ->> 'status' from public.admin_activity_log where action = 'slot.delete') = 'accepted', 'log records the affected request');
end $$;
select test.as_user('50000000-0000-0000-0000-0000000000b1');
select test.fails($$ select public.admin_delete_slot(gen_random_uuid()) $$, '42501');
select test.reset();

rollback;
\o
\echo 'ALL DAY 5 TESTS PASSED'
