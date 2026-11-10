-- Tests for the Day 6 migration (accept / decline / cancel, upcoming_sessions). Rolled back at the end.
-- The two-sessions-at-once double-booking test is scripts/test-concurrency.sh.
\o /dev/null
begin;

insert into auth.users (id, email, raw_user_meta_data) values
  ('60000000-0000-0000-0000-0000000000a1', 's1@example.com', '{"name":"Sam One","date_of_birth":"2000-01-01"}'),
  ('60000000-0000-0000-0000-0000000000a2', 's2@example.com', '{"name":"Sue Two","date_of_birth":"2000-01-01"}'),
  ('60000000-0000-0000-0000-0000000000a3', 's3@example.com', '{"name":"Tom Three","date_of_birth":"2000-01-01"}');
insert into auth.users (id, email, raw_user_meta_data)
  select '60000000-0000-0000-0000-0000000000b1', 'p1@example.com',
         jsonb_build_object('role','professional','name','Pat Pro','career_id', c.id::text) from public.careers c where c.name = 'Law';
insert into auth.users (id, email, raw_user_meta_data)
  select '60000000-0000-0000-0000-0000000000b2', 'p2@example.com',
         jsonb_build_object('role','professional','name','Quin Pro','career_id', c.id::text) from public.careers c where c.name = 'Law';
update public.professional_profiles set verification_status = 'verified', verified_at = now()
 where user_id in ('60000000-0000-0000-0000-0000000000b1', '60000000-0000-0000-0000-0000000000b2');

-- two future slots for P1 and one for P2 (created as the service role)
insert into public.availability_slots (id, professional_id, start_time, end_time, meeting_url) values
  ('60000000-0000-0000-0000-00000000e001', '60000000-0000-0000-0000-0000000000b1', now() + interval '2 days', now() + interval '2 days 1 hour', 'https://meet.example.com/p1-a'),
  ('60000000-0000-0000-0000-00000000e002', '60000000-0000-0000-0000-0000000000b1', now() + interval '3 days', now() + interval '3 days 1 hour', 'https://meet.example.com/p1-b'),
  ('60000000-0000-0000-0000-00000000e003', '60000000-0000-0000-0000-0000000000b2', now() + interval '2 days', now() + interval '2 days 1 hour', null);

-- S1, S2 and S3 all ask for slot e001
select test.as_user('60000000-0000-0000-0000-0000000000a1');
select public.request_session('60000000-0000-0000-0000-00000000e001', 'from S1');
select test.reset();
select test.as_user('60000000-0000-0000-0000-0000000000a2');
select public.request_session('60000000-0000-0000-0000-00000000e001', 'from S2');
select public.request_session('60000000-0000-0000-0000-00000000e002', 'S2 also wants slot b');
select test.reset();
select test.as_user('60000000-0000-0000-0000-0000000000a3');
select public.request_session('60000000-0000-0000-0000-00000000e001', 'from S3');
select test.reset();

-- ---------- who may accept ----------
select test.as_user('60000000-0000-0000-0000-0000000000a1');                       -- a student
select test.fails($$ select public.accept_request((select id from public.mentorship_requests where message = 'from S1')) $$, '42501');
select test.reset();
select test.as_user('60000000-0000-0000-0000-0000000000b2');                       -- the wrong professional
select test.fails($$ select public.accept_request((select id from public.mentorship_requests where message = 'from S1')) $$, 'P0002');
select test.reset();
select test.as_anon();
select test.fails($$ select public.accept_request(gen_random_uuid()) $$, '42501');
select test.reset();

-- ---------- accepting ----------
select test.as_user('60000000-0000-0000-0000-0000000000b1');
select test.ok($$ select public.accept_request((select id from public.mentorship_requests where message = 'from S2')) $$);
-- the second accept on the same slot is refused (the request was auto-declined)
select test.fails($$ select public.accept_request((select id from public.mentorship_requests where message = 'from S1')) $$, '23514');
select test.fails($$ select public.accept_request((select id from public.mentorship_requests where message = 'from S2')) $$, '23514');   -- already answered
select test.reset();
do $$
begin
  perform test.assert((select status from public.availability_slots where id = '60000000-0000-0000-0000-00000000e001') = 'booked', 'slot booked');
  perform test.assert((select status from public.mentorship_requests where message = 'from S2') = 'accepted', 'S2 accepted');
  perform test.assert((select decided_at from public.mentorship_requests where message = 'from S2') is not null, 'decided_at set');
  perform test.assert((select count(*) from public.mentorship_requests where availability_slot_id = '60000000-0000-0000-0000-00000000e001' and status = 'declined') = 2, 'the two competing requests were declined');
  perform test.assert((select decline_reason from public.mentorship_requests where message = 'from S1') = 'This slot was booked by another student', 'decline reason');
  perform test.assert((select status from public.mentorship_requests where message = 'S2 also wants slot b') = 'pending', 'unrelated request untouched');
end $$;

-- a booked slot cannot be requested any more
select test.as_user('60000000-0000-0000-0000-0000000000a1');
select test.fails($$ select public.request_session('60000000-0000-0000-0000-00000000e001') $$, '23514');
select test.reset();

-- ---------- declining ----------
select test.as_user('60000000-0000-0000-0000-0000000000b1');
select test.fails($$ select public.decline_request((select id from public.mentorship_requests where message = 'S2 also wants slot b'), repeat('x', 501)) $$, '22023');
select test.ok($$ select public.decline_request((select id from public.mentorship_requests where message = 'S2 also wants slot b'), '  Not available that day  ') $$);
select test.fails($$ select public.decline_request((select id from public.mentorship_requests where message = 'S2 also wants slot b')) $$, '23514');
select test.reset();
do $$
begin
  perform test.assert((select decline_reason from public.mentorship_requests where message = 'S2 also wants slot b') = 'Not available that day', 'reason stored trimmed');
  perform test.assert((select status from public.availability_slots where id = '60000000-0000-0000-0000-00000000e002') = 'open', 'a declined request leaves the slot open');
end $$;

-- ---------- upcoming_sessions ----------
select test.as_user('60000000-0000-0000-0000-0000000000a2');
do $$
declare r record;
begin
  perform test.assert((select count(*) from public.upcoming_sessions) = 1, 'S2 has one upcoming session');
  select * into r from public.upcoming_sessions;
  perform test.assert(r.professional_name = 'Pat Pro' and r.student_name = 'Sue Two', 'names');
  perform test.assert(r.meeting_url = 'https://meet.example.com/p1-a', 'S2 gets the meeting link after acceptance');
end $$;
select test.reset();
select test.as_user('60000000-0000-0000-0000-0000000000a1');
select test.assert((select count(*) from public.upcoming_sessions) = 0, 'S1 (declined) has none');
select test.reset();
select test.as_user('60000000-0000-0000-0000-0000000000b1');
select test.assert((select count(*) from public.upcoming_sessions) = 1, 'the professional sees it too');
select test.reset();
select test.as_user('60000000-0000-0000-0000-0000000000b2');
select test.assert((select count(*) from public.upcoming_sessions) = 0, 'another professional sees none');
select test.reset();

-- ---------- cancelling ----------
-- a stranger and the wrong role
select test.as_user('60000000-0000-0000-0000-0000000000a3');
select test.fails($$ select public.cancel_session((select id from public.mentorship_requests where message = 'from S2')) $$, 'P0002');
select test.reset();
-- a professional cannot "cancel" a pending request (they decline)
select test.as_user('60000000-0000-0000-0000-0000000000a2');
select public.request_session('60000000-0000-0000-0000-00000000e002', 'second try on b');
select test.reset();
select test.as_user('60000000-0000-0000-0000-0000000000b1');
select test.fails($$ select public.cancel_session((select id from public.mentorship_requests where message = 'second try on b')) $$, '42501');
select test.reset();
-- the student withdraws a pending request
select test.as_user('60000000-0000-0000-0000-0000000000a2');
select test.ok($$ select public.cancel_session((select id from public.mentorship_requests where message = 'second try on b'), 'Changed my mind') $$);
select test.fails($$ select public.cancel_session((select id from public.mentorship_requests where message = 'second try on b')) $$, '23514');   -- already cancelled
select test.reset();
do $$
begin
  perform test.assert((select status from public.mentorship_requests where message = 'second try on b') = 'cancelled', 'withdrawn');
  perform test.assert((select cancel_reason from public.mentorship_requests where message = 'second try on b') = 'Changed my mind', 'cancel reason');
  perform test.assert((select cancelled_at from public.mentorship_requests where message = 'second try on b') is not null, 'cancelled_at');
  perform test.assert((select status from public.availability_slots where id = '60000000-0000-0000-0000-00000000e002') = 'open', 'withdrawing a pending request keeps the slot open');
end $$;

-- the professional cancels an accepted session: the slot reopens, the student can be re-booked
select test.as_user('60000000-0000-0000-0000-0000000000b1');
select test.ok($$ select public.cancel_session((select id from public.mentorship_requests where message = 'from S2'), 'Emergency') $$);
select test.reset();
do $$
begin
  perform test.assert((select status from public.mentorship_requests where message = 'from S2') = 'cancelled', 'session cancelled');
  perform test.assert((select status from public.availability_slots where id = '60000000-0000-0000-0000-00000000e001') = 'open', 'slot reopened');
end $$;
select test.as_user('60000000-0000-0000-0000-0000000000a1');
select test.ok($$ select public.request_session('60000000-0000-0000-0000-00000000e001', 'S1 again') $$);
select test.reset();

-- a started session cannot be cancelled: fake it by moving the booked slot into the past (service role)
select test.as_user('60000000-0000-0000-0000-0000000000b1');
select public.accept_request((select id from public.mentorship_requests where message = 'S1 again'));
select test.reset();
select set_config('nexa.slot_system_write', 'on', true);
update public.availability_slots set start_time = now() - interval '10 minutes', end_time = now() + interval '50 minutes'
 where id = '60000000-0000-0000-0000-00000000e001';
select set_config('nexa.slot_system_write', 'off', true);
select test.as_user('60000000-0000-0000-0000-0000000000a1');
select test.fails($$ select public.cancel_session((select id from public.mentorship_requests where message = 'S1 again')) $$, '23514');
select test.assert((select count(*) from public.upcoming_sessions) = 1, 'a session in progress still shows as upcoming');
select test.reset();
-- and it cannot be accepted after it started
update public.mentorship_requests set status = 'pending', decided_at = null where message = 'S1 again';
select set_config('nexa.slot_system_write', 'on', true);
update public.availability_slots set status = 'open' where id = '60000000-0000-0000-0000-00000000e001';
select set_config('nexa.slot_system_write', 'off', true);
select test.as_user('60000000-0000-0000-0000-0000000000b1');
select test.fails($$ select public.accept_request((select id from public.mentorship_requests where message = 'S1 again')) $$, '23514');
select test.reset();

-- no direct writes
select test.as_user('60000000-0000-0000-0000-0000000000a1');
select test.fails($$ update public.mentorship_requests set status = 'accepted' $$, '42501');
select test.fails($$ delete from public.mentorship_requests $$, '42501');
select test.reset();

-- ---------- close_user_activity (account deletion) ----------
-- (state at this point: S2's request on slot b was withdrawn, slot a holds a started session)
select test.as_user('60000000-0000-0000-0000-0000000000a3');
select public.request_session('60000000-0000-0000-0000-00000000e002', 'S3 for b');
select test.reset();
select test.as_user('60000000-0000-0000-0000-0000000000b1');
select public.accept_request((select id from public.mentorship_requests where message = 'S3 for b'));
select test.reset();
do $$
begin
  perform test.assert(not has_function_privilege('authenticated', 'public.close_user_activity(uuid)', 'execute'), 'API roles cannot call close_user_activity');
  perform public.close_user_activity('60000000-0000-0000-0000-0000000000a3');       -- S3 leaves
  perform test.assert((select status from public.mentorship_requests where message = 'S3 for b') = 'cancelled', 'S3 session cancelled');
  perform test.assert((select status from public.availability_slots where id = '60000000-0000-0000-0000-00000000e002') = 'open', 'slot reopened');
  perform public.close_user_activity('60000000-0000-0000-0000-0000000000b1');       -- P1 leaves: future slots removed
  perform test.assert(not exists (select 1 from public.availability_slots where professional_id = '60000000-0000-0000-0000-0000000000b1' and status = 'open' and end_time > now()), 'no open future slots left for the departed professional');
end $$;

rollback;
\o
\echo 'ALL DAY 6 TESTS PASSED'
