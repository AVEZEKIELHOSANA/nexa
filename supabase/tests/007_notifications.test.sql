-- Tests for the Day 7 migration (notifications and admin requests overview). Rolled back at the end.
\o /dev/null
begin;

insert into auth.users (id, email, raw_user_meta_data) values
  ('70000000-0000-0000-0000-00000000000a', 'admin@example.com', '{"name":"Alice Admin","date_of_birth":"1990-01-01"}'),
  ('70000000-0000-0000-0000-0000000000a1', 's1@example.com', '{"name":"Sam One","date_of_birth":"2000-01-01"}'),
  ('70000000-0000-0000-0000-0000000000a2', 's2@example.com', '{"name":"Sue Two","date_of_birth":"2000-01-01"}');
insert into auth.users (id, email, raw_user_meta_data)
  select '70000000-0000-0000-0000-0000000000b1', 'p1@example.com',
         jsonb_build_object('role','professional','name','Pat Pro','career_id', c.id::text) from public.careers c where c.name = 'Law';
update public.profiles set role_id = (select id from public.roles where name = 'admin') where id = '70000000-0000-0000-0000-00000000000a';

-- verification result (admin verifies Pat)
select test.as_user('70000000-0000-0000-0000-00000000000a');
select public.reject_professional('70000000-0000-0000-0000-0000000000b1', 'Please upload a clearer document');
select public.verify_professional('70000000-0000-0000-0000-0000000000b1');
select test.reset();
do $$
begin
  perform test.assert((select count(*) from public.notifications where user_id = '70000000-0000-0000-0000-0000000000b1' and type = 'verification_result') = 2, 'two verification notifications');
  perform test.assert((select payload ->> 'reason' from public.notifications where type = 'verification_result' and payload ->> 'status' = 'rejected') = 'Please upload a clearer document', 'reason in payload');
end $$;

insert into public.availability_slots (id, professional_id, start_time, end_time) values
  ('70000000-0000-0000-0000-00000000e001', '70000000-0000-0000-0000-0000000000b1', now() + interval '2 days', now() + interval '2 days 1 hour'),
  ('70000000-0000-0000-0000-00000000e002', '70000000-0000-0000-0000-0000000000b1', now() + interval '3 days', now() + interval '3 days 1 hour');

-- new request -> professional
select test.as_user('70000000-0000-0000-0000-0000000000a1');
select public.request_session('70000000-0000-0000-0000-00000000e001', 'S1 asks');
select test.reset();
select test.as_user('70000000-0000-0000-0000-0000000000a2');
select public.request_session('70000000-0000-0000-0000-00000000e001', 'S2 asks');
select public.request_session('70000000-0000-0000-0000-00000000e002', 'S2 asks b');
select test.reset();
do $$
declare r record;
begin
  perform test.assert((select count(*) from public.notifications where user_id = '70000000-0000-0000-0000-0000000000b1' and type = 'new_request') = 3, 'the professional is told about each request');
  select * into r from public.notifications where type = 'new_request' order by created_at limit 1;
  perform test.assert(r.payload ->> 'student_name' = 'Sam One' and r.payload ->> 'professional_name' = 'Pat Pro', 'names in payload');
  perform test.assert(r.payload ->> 'start_time' is not null and r.payload ->> 'request_id' is not null, 'time and request id in payload');
  perform test.assert(r.read_at is null, 'unread');
end $$;

-- accept S1 -> S1 accepted, S2 auto-declined
select test.as_user('70000000-0000-0000-0000-0000000000b1');
select public.accept_request((select id from public.mentorship_requests where message = 'S1 asks'));
select public.decline_request((select id from public.mentorship_requests where message = 'S2 asks b'), 'Busy that day');
select test.reset();
do $$
begin
  perform test.assert((select count(*) from public.notifications where user_id = '70000000-0000-0000-0000-0000000000a1' and type = 'request_accepted') = 1, 'S1 told: accepted');
  perform test.assert((select count(*) from public.notifications where user_id = '70000000-0000-0000-0000-0000000000a2' and type = 'request_declined') = 2, 'S2 told twice: auto-declined and declined');
  perform test.assert((select count(*) from public.notifications where payload ->> 'reason' = 'Busy that day') = 1, 'decline reason in payload');
  perform test.assert((select count(*) from public.notifications where payload ->> 'reason' = 'This slot was booked by another student') = 1, 'auto-decline reason in payload');
end $$;

-- cancellation notifies the OTHER party only
select test.as_user('70000000-0000-0000-0000-0000000000a1');
select public.cancel_session((select id from public.mentorship_requests where message = 'S1 asks'), 'Exam clash');
select test.reset();
do $$
declare r record;
begin
  perform test.assert((select count(*) from public.notifications where type = 'session_cancelled') = 1, 'one cancellation notification');
  select * into r from public.notifications where type = 'session_cancelled';
  perform test.assert(r.user_id = '70000000-0000-0000-0000-0000000000b1', 'sent to the professional, not to the canceller');
  perform test.assert(r.payload ->> 'cancelled_by' = 'student' and r.payload ->> 'reason' = 'Exam clash' and (r.payload ->> 'was_pending')::boolean = false, 'cancel payload');
end $$;

-- an admin deleting a booked slot tells both
select test.as_user('70000000-0000-0000-0000-0000000000a2');
select public.request_session('70000000-0000-0000-0000-00000000e001', 'S2 again');     -- the slot reopened when S1 cancelled
select test.reset();
select test.as_user('70000000-0000-0000-0000-0000000000b1');
select public.accept_request((select id from public.mentorship_requests where message = 'S2 again'));
select test.reset();
delete from public.notifications;
select test.as_user('70000000-0000-0000-0000-00000000000a');
select public.admin_delete_slot('70000000-0000-0000-0000-00000000e001');
select test.reset();
do $$
begin
  perform test.assert((select count(*) from public.notifications where type = 'session_cancelled') = 2, 'both parties told when an admin removes the slot');
  perform test.assert((select count(distinct user_id) from public.notifications where type = 'session_cancelled') = 2, 'one each');
  perform test.assert((select payload ->> 'cancelled_by' from public.notifications where type = 'session_cancelled' limit 1) = 'admin', 'cancelled_by admin');
end $$;

-- ---------- access rules ----------
select test.as_user('70000000-0000-0000-0000-0000000000a2');
do $$
declare n int;
begin
  perform test.assert((select count(*) from public.notifications) = (select count(*) from public.notifications where user_id = auth.uid()), 'only own notifications are visible');
  update public.notifications set read_at = now() where user_id <> auth.uid();
  get diagnostics n = row_count;
  perform test.assert(n = 0, 'cannot touch someone else''s notification');
end $$;
select test.fails($$ update public.notifications set type = 'hacked' where user_id = auth.uid() $$, '42501');
select test.fails($$ update public.notifications set user_id = '70000000-0000-0000-0000-0000000000a1' where user_id = auth.uid() $$, '42501');
select test.fails($$ insert into public.notifications (user_id, type) values (auth.uid(), 'forged') $$, '42501');
select test.fails($$ delete from public.notifications $$, '42501');
select test.fails($$ select public.notify(auth.uid(), 'forged') $$, '42501');
select test.ok($$ update public.notifications set read_at = now() where id = (select id from public.notifications where user_id = auth.uid() limit 1) $$);
do $$
declare before_unread int; marked int;
begin
  select count(*) into before_unread from public.notifications where read_at is null;
  marked := public.mark_all_notifications_read();
  perform test.assert(marked = before_unread, 'mark_all returns the number it marked');
  perform test.assert((select count(*) from public.notifications where read_at is null) = 0, 'nothing left unread');
end $$;
select test.reset();
-- S2's call did not touch anyone else's
do $$
begin
  perform test.assert((select count(*) from public.notifications where user_id <> '70000000-0000-0000-0000-0000000000a2' and read_at is not null) = 0, 'mark_all only touches the caller');
end $$;
select test.as_anon();
select test.fails($$ select * from public.notifications $$, '42501');
select test.fails($$ select public.mark_all_notifications_read() $$, '42501');
select test.reset();

-- realtime publication
do $$
begin
  perform test.assert(exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'notifications'), 'notifications is in the realtime publication');
end $$;

-- ---------- admin_list_requests ----------
select test.as_user('70000000-0000-0000-0000-0000000000a1');
select test.fails($$ select * from public.admin_list_requests() $$, '42501');
select test.reset();
select test.as_user('70000000-0000-0000-0000-00000000000a');
do $$
declare r record;
begin
  perform test.assert((select count(*) from public.admin_list_requests()) = 4, 'all four requests listed');
  perform test.assert((select max(total_count) from public.admin_list_requests()) = 4, 'total_count');
  perform test.assert((select count(*) from public.admin_list_requests(p_status => 'cancelled')) = 2, 'filter by status (the slot deletion cancelled one, S1 cancelled the other)');
  perform test.assert((select count(*) from public.admin_list_requests(p_career_id => (select id from public.careers where name = 'Law'))) = 4, 'filter by career');
  perform test.assert((select count(*) from public.admin_list_requests(p_career_id => (select id from public.careers where name = 'Journalism & Media'))) = 0, 'other career is empty');
  perform test.assert((select count(*) from public.admin_list_requests(p_page => 2, p_page_size => 3)) = 1, 'pagination');
  select * into r from public.admin_list_requests(p_status => 'declined') limit 1;
  perform test.assert(r.career_name = 'Law' and r.professional_name = 'Pat Pro', 'career and names joined');
end $$;
select test.fails($$ select * from public.admin_list_requests(p_status => 'bogus') $$, '22023');
select test.reset();

rollback;
\o
\echo 'ALL DAY 7 TESTS PASSED'
