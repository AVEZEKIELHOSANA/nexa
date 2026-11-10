-- Tests for the Day 8 migration (messages, my_conversations, reports). Rolled back at the end.
\o /dev/null
begin;

insert into auth.users (id, email, raw_user_meta_data) values
  ('80000000-0000-0000-0000-00000000000a', 'admin@example.com', '{"name":"Alice Admin","date_of_birth":"1990-01-01"}'),
  ('80000000-0000-0000-0000-0000000000a1', 's1@example.com', '{"name":"Sam One","date_of_birth":"2000-01-01"}'),
  ('80000000-0000-0000-0000-0000000000a2', 's2@example.com', '{"name":"Sue Two","date_of_birth":"2000-01-01"}');
insert into auth.users (id, email, raw_user_meta_data)
  select '80000000-0000-0000-0000-0000000000b1', 'p1@example.com',
         jsonb_build_object('role','professional','name','Pat Pro','career_id', c.id::text) from public.careers c where c.name = 'Law';
insert into auth.users (id, email, raw_user_meta_data)
  select '80000000-0000-0000-0000-0000000000b2', 'p2@example.com',
         jsonb_build_object('role','professional','name','Quin Pro','career_id', c.id::text) from public.careers c where c.name = 'Law';
update public.profiles set role_id = (select id from public.roles where name = 'admin') where id = '80000000-0000-0000-0000-00000000000a';
update public.professional_profiles set verification_status = 'verified', verified_at = now()
 where user_id in ('80000000-0000-0000-0000-0000000000b1', '80000000-0000-0000-0000-0000000000b2');

insert into public.availability_slots (id, professional_id, start_time, end_time) values
  ('80000000-0000-0000-0000-00000000e001', '80000000-0000-0000-0000-0000000000b1', now() + interval '2 days', now() + interval '2 days 1 hour'),
  ('80000000-0000-0000-0000-00000000e002', '80000000-0000-0000-0000-0000000000b1', now() + interval '3 days', now() + interval '3 days 1 hour');

-- S1 <-> P1 accepted; S2 -> P1 still pending (no conversation)
select test.as_user('80000000-0000-0000-0000-0000000000a1');
select public.request_session('80000000-0000-0000-0000-00000000e001', 'S1');
select test.reset();
select test.as_user('80000000-0000-0000-0000-0000000000a2');
select public.request_session('80000000-0000-0000-0000-00000000e002', 'S2');
select test.reset();
select test.as_user('80000000-0000-0000-0000-0000000000b1');
select public.accept_request((select id from public.mentorship_requests where message = 'S1'));
select test.reset();
select set_config('test.req', (select id::text from public.mentorship_requests where message = 'S1'), true);
select set_config('test.req2', (select id::text from public.mentorship_requests where message = 'S2'), true);

-- ---------- sending ----------
select test.as_user('80000000-0000-0000-0000-0000000000a1');
select test.ok($$ insert into public.messages (mentorship_request_id, sender_id, body) values (current_setting('test.req')::uuid, auth.uid(), '  Hello Pat!  ') $$);
select test.fails($$ insert into public.messages (mentorship_request_id, sender_id, body) values (current_setting('test.req')::uuid, '80000000-0000-0000-0000-0000000000b1', 'as someone else') $$, '42501');
select test.fails($$ insert into public.messages (mentorship_request_id, sender_id, body) values (current_setting('test.req')::uuid, auth.uid(), repeat('x', 2001)) $$);
select test.fails($$ insert into public.messages (mentorship_request_id, sender_id, body) values (current_setting('test.req')::uuid, auth.uid(), '    ') $$, '42501');
select test.fails($$ insert into public.messages (mentorship_request_id, sender_id, body) values (current_setting('test.req2')::uuid, auth.uid(), 'not my request') $$, '42501');
select test.reset();
do $$
begin
  perform test.assert((select body from public.messages) = 'Hello Pat!', 'body trimmed');
end $$;

-- a pending request (S2 -> P1) is not a conversation
select test.as_user('80000000-0000-0000-0000-0000000000a2');
select test.fails($$ insert into public.messages (mentorship_request_id, sender_id, body) values (current_setting('test.req2')::uuid, auth.uid(), 'too early') $$, '42501');
select test.assert((select count(*) from public.messages) = 0, 'S2 cannot read the S1 conversation');
select test.assert((select count(*) from public.my_conversations) = 0, 'S2 has no conversation yet');
select test.reset();

-- an unmatched professional can neither read nor write
select test.as_user('80000000-0000-0000-0000-0000000000b2');
select test.assert((select count(*) from public.messages) = 0, 'unmatched professional reads nothing');
select test.fails($$ insert into public.messages (mentorship_request_id, sender_id, body) values (current_setting('test.req')::uuid, auth.uid(), 'intruder') $$, '42501');
select test.assert((select count(*) from public.my_conversations) = 0, 'and has no conversations');
select test.reset();
select test.as_anon();
select test.fails($$ select * from public.messages $$, '42501');
select test.fails($$ insert into public.messages (mentorship_request_id, sender_id, body) values (gen_random_uuid(), gen_random_uuid(), 'x') $$, '42501');
select test.reset();

-- ---------- reading, replying, notifications, unread counts ----------
select test.as_user('80000000-0000-0000-0000-0000000000b1');
do $$
declare r record;
begin
  perform test.assert((select count(*) from public.messages) = 1, 'P1 sees the message');
  select * into r from public.my_conversations;
  perform test.assert(r.other_user_name = 'Sam One' and r.unread_count = 1 and r.last_message = 'Hello Pat!', 'conversation row for P1');
  perform test.assert(r.last_sender_id = '80000000-0000-0000-0000-0000000000a1', 'last sender');
end $$;
select test.ok($$ insert into public.messages (mentorship_request_id, sender_id, body) values (current_setting('test.req')::uuid, auth.uid(), 'Hi Sam, glad to help.') $$);
select test.reset();
select test.as_user('80000000-0000-0000-0000-0000000000a1');
select test.ok($$ insert into public.messages (mentorship_request_id, sender_id, body) values (current_setting('test.req')::uuid, auth.uid(), 'Second message') $$);
select test.ok($$ insert into public.messages (mentorship_request_id, sender_id, body) values (current_setting('test.req')::uuid, auth.uid(), 'Third message') $$);
select test.reset();
do $$
begin
  perform test.assert((select count(*) from public.notifications where user_id = '80000000-0000-0000-0000-0000000000b1' and type = 'new_message') = 1,
    'three unanswered messages from S1 create ONE unread notification for P1');
  perform test.assert((select count(*) from public.notifications where user_id = '80000000-0000-0000-0000-0000000000a1' and type = 'new_message') = 1, 'S1 notified of the reply');
  perform test.assert((select payload ->> 'preview' from public.notifications where user_id = '80000000-0000-0000-0000-0000000000a1' and type = 'new_message') = 'Hi Sam, glad to help.', 'preview');
end $$;
-- once read, a later message notifies again
update public.notifications set read_at = now() where user_id = '80000000-0000-0000-0000-0000000000b1' and type = 'new_message';
select test.as_user('80000000-0000-0000-0000-0000000000a1');
select test.ok($$ insert into public.messages (mentorship_request_id, sender_id, body) values (current_setting('test.req')::uuid, auth.uid(), 'Fourth') $$);
select test.reset();
do $$
begin
  perform test.assert((select count(*) from public.notifications where user_id = '80000000-0000-0000-0000-0000000000b1' and type = 'new_message') = 2, 'a new unread notification after the first was read');
end $$;

-- marking read: only the recipient, only read_at
select test.as_user('80000000-0000-0000-0000-0000000000b1');
do $$
declare n int;
begin
  perform test.assert((select unread_count from public.my_conversations) = 4, 'P1 has 4 unread from S1');
  update public.messages set read_at = now() where mentorship_request_id = current_setting('test.req')::uuid and sender_id <> auth.uid();
  get diagnostics n = row_count;
  perform test.assert(n = 4, 'recipient marks S1 messages read');
  perform test.assert((select unread_count from public.my_conversations) = 0, 'unread is now 0');
  update public.messages set read_at = now() where sender_id = auth.uid();
  get diagnostics n = row_count;
  perform test.assert(n = 0, 'a sender cannot mark their own messages as read');
  update public.messages set read_at = null where sender_id <> auth.uid();   -- tries to un-read
  perform test.assert((select count(*) from public.messages where read_at is null and sender_id <> auth.uid()) = 0, 'read_at is one-way');
end $$;
select test.fails($$ update public.messages set body = 'edited' where sender_id <> auth.uid() $$, '42501');
select test.fails($$ delete from public.messages $$, '42501');
select test.reset();
select test.as_user('80000000-0000-0000-0000-0000000000a1');
select test.assert((select unread_count from public.my_conversations) = 1, 'S1 has 1 unread (the reply)');
select test.fails($$ update public.messages set body = 'rewrite history' $$, '42501');
select test.reset();

-- ---------- reports ----------
-- S1 reports the professional (profile) and a message; P1 reports the student from the thread
select test.as_user('80000000-0000-0000-0000-0000000000a1');
select test.ok($$ insert into public.reports (reporter_id, target_type, target_id, reason) values (auth.uid(), 'professional', '80000000-0000-0000-0000-0000000000b2', 'Asked me for money') $$);
select test.fails($$ insert into public.reports (reporter_id, target_type, target_id, reason) values (auth.uid(), 'professional', '80000000-0000-0000-0000-0000000000a2', 'a student is not a professional') $$, 'P0002');
select test.fails($$ insert into public.reports (reporter_id, target_type, target_id, reason) values (auth.uid(), 'professional', auth.uid(), 'myself') $$);
select test.fails($$ insert into public.reports (reporter_id, target_type, target_id, reason) values ('80000000-0000-0000-0000-0000000000a2', 'professional', '80000000-0000-0000-0000-0000000000b2', 'as someone else') $$, '42501');
select test.fails($$ insert into public.reports (reporter_id, target_type, target_id, reason) values (auth.uid(), 'professional', '80000000-0000-0000-0000-0000000000b2', 'no') $$, '22023');
select test.fails($$ insert into public.reports (reporter_id, target_type, target_id, reason, status) values (auth.uid(), 'professional', '80000000-0000-0000-0000-0000000000b2', 'valid reason', 'resolved') $$, '42501');
-- S1 can only report messages sent TO them: the reply from P1 is reportable, their own message is not
select test.fails($$ insert into public.reports (reporter_id, target_type, target_id, reason) values (auth.uid(), 'message', (select id from public.messages where body = 'Second message'), 'own message') $$, '23514');
select test.ok($$ insert into public.reports (reporter_id, target_type, target_id, reason) values (auth.uid(), 'message', (select id from public.messages where body = 'Hi Sam, glad to help.'), 'Inappropriate comment') $$);
select test.fails($$ insert into public.reports (reporter_id, target_type, target_id, reason) values (auth.uid(), 'student', '80000000-0000-0000-0000-0000000000a2', 'never met this person') $$, '23514');
select test.assert((select count(*) from public.reports) = 2, 'S1 sees own reports');
select test.reset();
select test.as_user('80000000-0000-0000-0000-0000000000b1');
select test.ok($$ insert into public.reports (reporter_id, target_type, target_id, reason) values (auth.uid(), 'student', '80000000-0000-0000-0000-0000000000a1', 'Rude language in chat') $$);
select test.assert((select count(*) from public.reports) = 1, 'P1 sees only own report');
select test.reset();
select test.as_user('80000000-0000-0000-0000-0000000000a2');
select test.assert((select count(*) from public.reports) = 0, 'S2 sees no reports');
select test.reset();

-- rate limit: 10 a day
do $$
declare i int;
begin
  perform test.as_user('80000000-0000-0000-0000-0000000000b1');
  for i in 1..9 loop
    insert into public.reports (reporter_id, target_type, target_id, reason) values (auth.uid(), 'student', '80000000-0000-0000-0000-0000000000a1', 'Report number ' || i);
  end loop;
  begin
    insert into public.reports (reporter_id, target_type, target_id, reason) values (auth.uid(), 'student', '80000000-0000-0000-0000-0000000000a1', 'one too many');
    raise exception 'the 11th report was accepted';
  exception when check_violation then null; end;
  perform test.reset();
end $$;
delete from public.reports where reason like 'Report number %';

-- ---------- admin: list, review, remove a message, resolve ----------
select test.as_user('80000000-0000-0000-0000-0000000000a1');
select test.fails($$ select * from public.admin_list_reports() $$, '42501');
select test.fails($$ select public.resolve_report((select id from public.reports limit 1)) $$, '42501');
select test.fails($$ select public.admin_remove_message((select id from public.messages limit 1)) $$, '42501');
select test.reset();

select test.as_user('80000000-0000-0000-0000-00000000000a');
do $$
declare r record;
begin
  perform test.assert((select count(*) from public.admin_list_reports()) = 3, 'admin lists 3 reports');
  perform test.assert((select count(*) from public.admin_list_reports(p_status => 'resolved')) = 0, 'none resolved yet');
  select * into r from public.admin_list_reports() where target_type = 'message';
  perform test.assert(r.reporter_name = 'Sam One' and r.target_name = 'Pat Pro', 'message report: reporter and sender resolved to names');
  perform test.assert((select count(*) from public.messages) = 5, 'admin reads every message');
end $$;
select public.admin_remove_message((select id from public.messages where body = 'Hi Sam, glad to help.'));
select test.fails($$ select public.admin_remove_message((select id from public.messages where body = 'Hi Sam, glad to help.')) $$, '23514');
select public.resolve_report((select id from public.reports where target_type = 'message'), 'Message removed, mentor warned');
select test.fails($$ select public.resolve_report((select id from public.reports where target_type = 'message')) $$, '23514');
select test.fails($$ select public.resolve_report(gen_random_uuid()) $$, 'P0002');
select test.assert((select count(*) from public.messages) = 5, 'admin still sees the removed message (audit trail)');
select test.assert((select count(*) from public.messages where deleted_at is not null) = 1, 'it is marked deleted');
select test.reset();
do $$
begin
  perform test.assert((select count(*) from public.admin_activity_log where action = 'message.remove') = 1, 'removal logged');
  perform test.assert((select count(*) from public.admin_activity_log where action = 'report.resolve') = 1, 'resolution logged');
  perform test.assert((select status from public.reports where target_type = 'message') = 'resolved', 'resolved');
  perform test.assert((select resolved_by from public.reports where target_type = 'message') = '80000000-0000-0000-0000-00000000000a', 'resolved_by');
  perform test.assert((select count(*) from public.notifications where user_id = '80000000-0000-0000-0000-0000000000a1' and type = 'report_resolved') = 1, 'reporter notified');
  perform test.assert((select payload::text not like '%warned%' from public.notifications where type = 'report_resolved'), 'private notes are not leaked into the notification');
end $$;

-- the removed message disappears for the parties
select test.as_user('80000000-0000-0000-0000-0000000000a1');
select test.assert((select count(*) from public.messages where body = 'Hi Sam, glad to help.') = 0, 'removed message hidden from the parties');
-- (all test rows share one transaction timestamp, so only check that the removed one is never the preview)
select test.assert((select last_message from public.my_conversations) <> 'Hi Sam, glad to help.', 'conversation preview ignores removed messages');
select test.reset();

-- ---------- cancelled request: readable, no longer writable ----------
select test.as_user('80000000-0000-0000-0000-0000000000a1');
select public.cancel_session(current_setting('test.req')::uuid, 'Schedule change');
select test.assert((select count(*) from public.messages) = 4, 'still readable after cancellation');
select test.assert((select count(*) from public.my_conversations where status = 'cancelled') = 1, 'conversation listed as cancelled');
select test.fails($$ insert into public.messages (mentorship_request_id, sender_id, body) values (current_setting('test.req')::uuid, auth.uid(), 'too late') $$, '42501');
select test.reset();

-- ---------- inactive accounts ----------
update public.profiles set is_active = false where id = '80000000-0000-0000-0000-0000000000a1';
select test.as_user('80000000-0000-0000-0000-0000000000a1');
select test.assert((select count(*) from public.messages) = 0, 'an inactive account reads no messages');
select test.fails($$ insert into public.reports (reporter_id, target_type, target_id, reason) values (auth.uid(), 'professional', '80000000-0000-0000-0000-0000000000b2', 'inactive reporter') $$, '42501');
select test.reset();

-- realtime publication
do $$
begin
  perform test.assert(exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'messages'), 'messages is in the realtime publication');
end $$;

rollback;
\o
\echo 'ALL DAY 8 TESTS PASSED'
