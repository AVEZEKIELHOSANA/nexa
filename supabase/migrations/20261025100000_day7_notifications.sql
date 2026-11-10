-- =====================================================================
-- Nexa  |  Migration Day 7  |  Notifications, triggers, admin requests overview
-- Tech Spec 2.1 (notify), 2.3 (notifications), 2.4 (mark_all_notifications_read), 2.7 (realtime)
--
-- Notification types written by this migration:
--   new_request, request_accepted, request_declined, session_cancelled, verification_result
-- (new_message and report_resolved arrive on Day 8, session_reminder on Day 10.)
-- Payloads carry everything the UI needs to render a line, so the bell never has to join.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. notify(user, type, payload): the only way a notification is created.
--    Internal: not callable from the API.
-- ---------------------------------------------------------------------
create or replace function public.notify(p_user_id uuid, p_type text, p_payload jsonb default '{}'::jsonb)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if p_user_id is null then
    return;
  end if;
  insert into public.notifications (user_id, type, payload)
  values (p_user_id, p_type, coalesce(p_payload, '{}'::jsonb));
end;
$$;
revoke all on function public.notify(uuid, text, jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 2. Policies: read your own; change only read_at; nothing is created or deleted from the API
-- ---------------------------------------------------------------------
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

drop policy if exists "notifications: read own" on public.notifications;
create policy "notifications: read own" on public.notifications
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "notifications: mark own as read" on public.notifications;
create policy "notifications: mark own as read" on public.notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.mark_all_notifications_read()
returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  v_count integer;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in' using errcode = '42501';
  end if;
  update public.notifications set read_at = now() where user_id = auth.uid() and read_at is null;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
revoke all on function public.mark_all_notifications_read() from public, anon, authenticated;
grant execute on function public.mark_all_notifications_read() to authenticated;

-- ---------------------------------------------------------------------
-- 3. Triggers
-- ---------------------------------------------------------------------

-- Requests: new request -> professional; decisions -> student; cancellations -> the other party.
create or replace function public.notify_request_events()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_payload jsonb;
  v_actor   uuid := auth.uid();
begin
  v_payload := jsonb_build_object(
    'request_id',        new.id,
    'student_id',        new.student_id,
    'professional_id',   new.professional_id,
    'student_name',      (select name from public.profiles where id = new.student_id),
    'professional_name', (select name from public.profiles where id = new.professional_id),
    'start_time',        (select start_time from public.availability_slots where id = new.availability_slot_id));

  if tg_op = 'INSERT' then
    perform public.notify(new.professional_id, 'new_request', v_payload);
    return new;
  end if;

  if new.status is not distinct from old.status then
    return new;
  end if;

  if new.status = 'accepted' then
    perform public.notify(new.student_id, 'request_accepted', v_payload);

  elsif new.status = 'declined' then
    perform public.notify(new.student_id, 'request_declined',
      v_payload || jsonb_build_object('reason', new.decline_reason));

  elsif new.status = 'cancelled' then
    v_payload := v_payload || jsonb_build_object(
      'reason', new.cancel_reason,
      'was_pending', old.status = 'pending',
      'cancelled_by', case when v_actor = new.student_id then 'student'
                           when v_actor = new.professional_id then 'professional'
                           else 'admin' end);
    if v_actor is distinct from new.student_id then
      perform public.notify(new.student_id, 'session_cancelled', v_payload);
    end if;
    if v_actor is distinct from new.professional_id then
      perform public.notify(new.professional_id, 'session_cancelled', v_payload);
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.notify_request_events() from public, anon, authenticated;
drop trigger if exists notify_request_events on public.mentorship_requests;
create trigger notify_request_events after insert or update of status on public.mentorship_requests
  for each row execute function public.notify_request_events();

-- Verification result -> the professional.
create or replace function public.notify_verification_result()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.verification_status is distinct from old.verification_status
     and new.verification_status in ('verified', 'rejected') then
    perform public.notify(new.user_id, 'verification_result',
      jsonb_build_object('status', new.verification_status, 'reason', new.rejection_reason));
  end if;
  return new;
end;
$$;
revoke all on function public.notify_verification_result() from public, anon, authenticated;
drop trigger if exists notify_verification_result on public.professional_profiles;
create trigger notify_verification_result after update of verification_status on public.professional_profiles
  for each row execute function public.notify_verification_result();

-- ---------------------------------------------------------------------
-- 4. Realtime: the navbar bell subscribes to inserts on notifications (RLS applies)
-- ---------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables
                      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications') then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 5. Admin: all requests, filterable by status and career, paginated
--    (the admin read policy on mentorship_requests itself was added on Day 5)
-- ---------------------------------------------------------------------
create or replace function public.admin_list_requests(
  p_status    text    default null,
  p_career_id uuid    default null,
  p_page      integer default 1,
  p_page_size integer default 20
)
returns table (
  request_id        uuid,
  status            text,
  created_at        timestamptz,
  decided_at        timestamptz,
  student_id        uuid,
  student_name      text,
  professional_id   uuid,
  professional_name text,
  career_id         uuid,
  career_name       text,
  start_time        timestamptz,
  end_time          timestamptz,
  total_count       bigint
)
language plpgsql stable security definer set search_path = ''
as $$
#variable_conflict use_column
declare
  v_page integer := greatest(coalesce(p_page, 1), 1);
  v_size integer := least(greatest(coalesce(p_page_size, 20), 1), 100);
begin
  if not public.is_admin() then
    raise exception 'Only an administrator can list all requests' using errcode = '42501';
  end if;
  if p_status is not null and p_status not in ('pending', 'accepted', 'declined', 'cancelled') then
    raise exception 'Unknown status %', p_status using errcode = '22023';
  end if;

  return query
  select r.id, r.status, r.created_at, r.decided_at,
         r.student_id, sp.name, r.professional_id, pr.name,
         pp.career_id, c.name, s.start_time, s.end_time,
         count(*) over () as total_count
  from public.mentorship_requests r
  join public.profiles sp on sp.id = r.student_id
  join public.profiles pr on pr.id = r.professional_id
  join public.availability_slots s on s.id = r.availability_slot_id
  left join public.professional_profiles pp on pp.user_id = r.professional_id
  left join public.careers c on c.id = pp.career_id
  where (p_status is null or r.status = p_status)
    and (p_career_id is null or pp.career_id = p_career_id)
  order by r.created_at desc, r.id
  offset (v_page - 1) * v_size
  limit v_size;
end;
$$;
revoke all on function public.admin_list_requests(text, uuid, integer, integer) from public, anon, authenticated;
grant execute on function public.admin_list_requests(text, uuid, integer, integer) to authenticated;
