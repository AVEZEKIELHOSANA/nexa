-- =====================================================================
-- Nexa  |  Migration Day 8  |  Messaging and safeguarding reports
-- Tech Spec 1.1 (my_conversations), 2.1 (notify_new_message), 2.3 (messages, reports),
-- 2.4 (resolve_report, admin_remove_message), 2.7 (realtime)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. messages
--    Read: the matched student and professional on an accepted request (and, read-only,
--    on one that was cancelled later), minus removed messages; admins read everything.
--    Insert: the matched pair, only while the request is accepted. 2000 characters (Day 1 check).
--    Update: the RECIPIENT may set read_at, nothing else (column grant + trigger).
--    No delete: removal is a soft delete by an admin (admin_remove_message).
-- ---------------------------------------------------------------------
grant select on public.messages to authenticated;
grant insert (mentorship_request_id, sender_id, body) on public.messages to authenticated;
grant update (read_at) on public.messages to authenticated;

create index if not exists messages_unread_idx on public.messages (mentorship_request_id) where read_at is null;

drop policy if exists "messages: parties read" on public.messages;
create policy "messages: parties read" on public.messages
  for select to authenticated
  using (
    deleted_at is null
    and public.is_active_user()
    and exists (
      select 1 from public.mentorship_requests r
      where r.id = messages.mentorship_request_id
        and r.status in ('accepted', 'cancelled')
        and auth.uid() in (r.student_id, r.professional_id)
    )
  );

drop policy if exists "messages: admin reads all" on public.messages;
create policy "messages: admin reads all" on public.messages
  for select to authenticated using (public.is_admin());

drop policy if exists "messages: parties send" on public.messages;
create policy "messages: parties send" on public.messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and public.is_active_user()
    and char_length(btrim(body)) between 1 and 2000
    and exists (
      select 1 from public.mentorship_requests r
      where r.id = messages.mentorship_request_id
        and r.status = 'accepted'
        and auth.uid() in (r.student_id, r.professional_id)
    )
  );

drop policy if exists "messages: recipient marks read" on public.messages;
create policy "messages: recipient marks read" on public.messages
  for update to authenticated
  using (
    sender_id <> auth.uid()
    and deleted_at is null
    and public.is_active_user()
    and exists (
      select 1 from public.mentorship_requests r
      where r.id = messages.mentorship_request_id
        and auth.uid() in (r.student_id, r.professional_id)
    )
  )
  with check (sender_id <> auth.uid());

-- Trim the body on the way in, and make read_at one-way (null -> time, never back).
create or replace function public.guard_message_changes()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.body := btrim(new.body);
    return new;
  end if;
  if auth.uid() is not null and old.read_at is not null and new.read_at is distinct from old.read_at then
    new.read_at := old.read_at;
  end if;
  return new;
end;
$$;
revoke all on function public.guard_message_changes() from public, anon, authenticated;
drop trigger if exists guard_message_changes on public.messages;
create trigger guard_message_changes before insert or update on public.messages
  for each row execute function public.guard_message_changes();

-- ---------------------------------------------------------------------
-- 2. my_conversations (security invoker: RLS still applies)
--    One row per accepted request of the caller, plus cancelled ones that already have messages
--    (they stay readable). Newest activity first when ordered by last_activity.
-- ---------------------------------------------------------------------
create or replace view public.my_conversations with (security_invoker = true) as
select
  r.id as request_id,
  r.status,
  case when r.student_id = auth.uid() then r.professional_id else r.student_id end as other_user_id,
  op.name as other_user_name,
  lm.body as last_message,
  lm.created_at as last_message_at,
  lm.sender_id as last_sender_id,
  coalesce(u.unread, 0)::integer as unread_count,
  coalesce(lm.created_at, r.decided_at, r.created_at) as last_activity
from public.mentorship_requests r
join public.profiles op
  on op.id = case when r.student_id = auth.uid() then r.professional_id else r.student_id end
left join lateral (
  select m.body, m.created_at, m.sender_id
  from public.messages m
  where m.mentorship_request_id = r.id and m.deleted_at is null
  order by m.created_at desc
  limit 1
) lm on true
left join lateral (
  select count(*) as unread
  from public.messages m
  where m.mentorship_request_id = r.id and m.deleted_at is null
    and m.sender_id <> auth.uid() and m.read_at is null
) u on true
where (r.student_id = auth.uid() or r.professional_id = auth.uid())
  and (r.status = 'accepted'
       or (r.status = 'cancelled' and exists (select 1 from public.messages m2 where m2.mentorship_request_id = r.id)));

revoke all on public.my_conversations from public, anon, authenticated;
grant select on public.my_conversations to authenticated;

-- ---------------------------------------------------------------------
-- 3. notify_new_message: tell the other party. While they still have an UNREAD
--    "new message" notification for that conversation we do not add another, so a long
--    chat does not flood the bell.
-- ---------------------------------------------------------------------
create or replace function public.notify_new_message()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_req public.mentorship_requests%rowtype;
  v_to  uuid;
begin
  select * into v_req from public.mentorship_requests where id = new.mentorship_request_id;
  if not found then
    return new;
  end if;
  v_to := case when new.sender_id = v_req.student_id then v_req.professional_id else v_req.student_id end;

  if not exists (
    select 1 from public.notifications n
    where n.user_id = v_to and n.type = 'new_message' and n.read_at is null
      and n.payload ->> 'request_id' = new.mentorship_request_id::text
  ) then
    perform public.notify(v_to, 'new_message', jsonb_build_object(
      'request_id',  new.mentorship_request_id,
      'sender_id',   new.sender_id,
      'sender_name', (select name from public.profiles where id = new.sender_id),
      'preview',     left(new.body, 80)));
  end if;
  return new;
end;
$$;
revoke all on function public.notify_new_message() from public, anon, authenticated;
drop trigger if exists notify_new_message on public.messages;
create trigger notify_new_message after insert on public.messages
  for each row execute function public.notify_new_message();

-- Realtime: the conversation thread subscribes to inserts (RLS decides who receives them)
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables
                      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages') then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 4. reports
--    Any active signed-in user files a report as themselves. Reviewing and resolving is admin-only
--    and happens through resolve_report. The insert trigger checks that the report is about
--    something the reporter is actually connected to, and rate-limits them.
-- ---------------------------------------------------------------------
grant select on public.reports to authenticated;
grant insert (reporter_id, target_type, target_id, reason) on public.reports to authenticated;

drop policy if exists "reports: read own" on public.reports;
create policy "reports: read own" on public.reports
  for select to authenticated using (reporter_id = auth.uid());

drop policy if exists "reports: admin read" on public.reports;
create policy "reports: admin read" on public.reports
  for select to authenticated using (public.is_admin());

drop policy if exists "reports: file as yourself" on public.reports;
create policy "reports: file as yourself" on public.reports
  for insert to authenticated
  with check (reporter_id = auth.uid() and public.is_active_user());

create or replace function public.validate_report()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_level  text;
  v_msg    public.messages%rowtype;
  v_linked boolean;
begin
  new.reason := btrim(new.reason);
  if char_length(new.reason) < 5 then
    raise exception 'Please describe your concern in at least 5 characters' using errcode = '22023';
  end if;

  if (select count(*) from public.reports
       where reporter_id = new.reporter_id and created_at > now() - interval '1 day') >= 10 then
    raise exception 'You have filed too many reports today. An administrator will review them.' using errcode = '23514';
  end if;

  if new.target_type = 'message' then
    select * into v_msg from public.messages where id = new.target_id;
    if not found or not exists (
      select 1 from public.mentorship_requests r
      where r.id = v_msg.mentorship_request_id and new.reporter_id in (r.student_id, r.professional_id)
    ) or v_msg.sender_id = new.reporter_id then
      raise exception 'You can only report messages sent to you' using errcode = '23514';
    end if;

  elsif new.target_type in ('professional', 'student') then
    if new.target_id = new.reporter_id then
      raise exception 'You cannot report yourself' using errcode = '23514';
    end if;
    select r.access_level into v_level
    from public.profiles p join public.roles r on r.id = p.role_id
    where p.id = new.target_id and p.deleted_at is null;
    if v_level is distinct from new.target_type then
      raise exception 'The person you are reporting was not found' using errcode = 'P0002';
    end if;
    if new.target_type = 'student' then
      -- only people you have dealt with: a mentorship request or a peer connection
      select exists (select 1 from public.mentorship_requests r
                      where (r.student_id = new.target_id and r.professional_id = new.reporter_id))
          or exists (select 1 from public.peer_connections c
                      where (c.requester_id = new.reporter_id and c.recipient_id = new.target_id)
                         or (c.recipient_id = new.reporter_id and c.requester_id = new.target_id))
        into v_linked;
      if not v_linked then
        raise exception 'You can only report students you have been in contact with' using errcode = '23514';
      end if;
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.validate_report() from public, anon, authenticated;
drop trigger if exists validate_report on public.reports;
create trigger validate_report before insert on public.reports
  for each row execute function public.validate_report();

-- resolve_report(report_id, notes)    caller: admin. Notifies the reporter (without the private notes).
create or replace function public.resolve_report(p_report_id uuid, p_notes text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_report public.reports%rowtype;
  v_notes  text := nullif(btrim(coalesce(p_notes, '')), '');
begin
  if not public.is_admin() then
    raise exception 'Only an administrator can resolve reports' using errcode = '42501';
  end if;
  if v_notes is not null and char_length(v_notes) > 2000 then
    raise exception 'The notes must be 2000 characters or fewer' using errcode = '22023';
  end if;

  select * into v_report from public.reports where id = p_report_id for update;
  if not found then
    raise exception 'Report not found' using errcode = 'P0002';
  end if;
  if v_report.status = 'resolved' then
    raise exception 'This report is already resolved' using errcode = '23514';
  end if;

  update public.reports
     set status = 'resolved', resolved_by = auth.uid(), resolved_at = now(), resolution_notes = v_notes
   where id = p_report_id;

  perform public.notify(v_report.reporter_id, 'report_resolved',
    jsonb_build_object('report_id', p_report_id, 'target_type', v_report.target_type));
  perform public.log_admin_action('report.resolve', 'report', p_report_id,
    jsonb_build_object('target_type', v_report.target_type, 'target_id', v_report.target_id, 'notes', v_notes));
end;
$$;

-- admin_remove_message(message_id)    caller: admin. Soft delete: the row stays for the audit trail.
create or replace function public.admin_remove_message(p_message_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_msg public.messages%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Only an administrator can remove messages' using errcode = '42501';
  end if;
  select * into v_msg from public.messages where id = p_message_id for update;
  if not found then
    raise exception 'Message not found' using errcode = 'P0002';
  end if;
  if v_msg.deleted_at is not null then
    raise exception 'This message was already removed' using errcode = '23514';
  end if;

  update public.messages set deleted_at = now() where id = p_message_id;
  perform public.log_admin_action('message.remove', 'message', p_message_id,
    jsonb_build_object('request_id', v_msg.mentorship_request_id, 'sender_id', v_msg.sender_id));
end;
$$;

-- admin_list_reports: reports with the reporter and target resolved to names, paginated
create or replace function public.admin_list_reports(
  p_status    text    default null,        -- open | resolved | null = all
  p_page      integer default 1,
  p_page_size integer default 20
)
returns table (
  id               uuid,
  status           text,
  target_type      text,
  target_id        uuid,
  target_name      text,
  reason           text,
  reporter_id      uuid,
  reporter_name    text,
  created_at       timestamptz,
  resolved_at      timestamptz,
  resolution_notes text,
  total_count      bigint
)
language plpgsql stable security definer set search_path = ''
as $$
#variable_conflict use_column
declare
  v_page integer := greatest(coalesce(p_page, 1), 1);
  v_size integer := least(greatest(coalesce(p_page_size, 20), 1), 100);
begin
  if not public.is_admin() then
    raise exception 'Only an administrator can list reports' using errcode = '42501';
  end if;
  if p_status is not null and p_status not in ('open', 'resolved') then
    raise exception 'Unknown status %', p_status using errcode = '22023';
  end if;

  return query
  select rp.id, rp.status, rp.target_type, rp.target_id,
         case when rp.target_type = 'message'
              then (select sp.name from public.messages m join public.profiles sp on sp.id = m.sender_id where m.id = rp.target_id)
              else (select tp.name from public.profiles tp where tp.id = rp.target_id) end,
         rp.reason, rp.reporter_id, rep.name, rp.created_at, rp.resolved_at, rp.resolution_notes,
         count(*) over () as total_count
  from public.reports rp
  join public.profiles rep on rep.id = rp.reporter_id
  where (p_status is null or rp.status = p_status)
  order by (rp.status = 'open') desc, rp.created_at desc, rp.id
  offset (v_page - 1) * v_size
  limit v_size;
end;
$$;

revoke all on function public.resolve_report(uuid, text), public.admin_remove_message(uuid),
                       public.admin_list_reports(text, integer, integer) from public, anon, authenticated;
grant execute on function public.resolve_report(uuid, text), public.admin_remove_message(uuid),
                          public.admin_list_reports(text, integer, integer) to authenticated;
