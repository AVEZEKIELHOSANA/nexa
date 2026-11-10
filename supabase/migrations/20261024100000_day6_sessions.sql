-- =====================================================================
-- Nexa  |  Migration Day 6  |  Mentorship requests and sessions
-- Tech Spec 2.4 (accept_request, decline_request, cancel_session), 1.1 (upcoming_sessions)
--
-- accept_request takes a row lock on the slot FIRST, so two professionals' clicks (or two
-- tabs) can never book one slot twice. The unique index requests_one_accepted_per_slot
-- from Day 1 is the second line of defence.
-- Notifications for all of these status changes come from the Day 7 triggers.
-- ---------------------------------------------------------------------

-- Everyone can read their own profile row (Day 2 normally created this; harmless if it exists).
grant select on public.profiles to authenticated;
drop policy if exists "profiles: read own" on public.profiles;
create policy "profiles: read own" on public.profiles
  for select to authenticated using (id = auth.uid());

-- ---------------------------------------------------------------------
-- accept_request(request_id)      caller: the professional who owns the request
-- ---------------------------------------------------------------------
create or replace function public.accept_request(p_request_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid  uuid := auth.uid();
  v_req  public.mentorship_requests%rowtype;
  v_slot public.availability_slots%rowtype;
begin
  if v_uid is null or public.current_access_level() is distinct from 'professional' or not public.is_active_user() then
    raise exception 'Only active professionals can accept requests' using errcode = '42501';
  end if;

  select * into v_req from public.mentorship_requests where id = p_request_id;
  if not found or v_req.professional_id <> v_uid then
    raise exception 'Request not found' using errcode = 'P0002';
  end if;

  -- 1) lock the slot, 2) then re-read the request under the lock
  select * into v_slot from public.availability_slots where id = v_req.availability_slot_id for update;
  select * into v_req  from public.mentorship_requests where id = p_request_id for update;

  if v_req.status <> 'pending' then
    raise exception 'This request has already been answered' using errcode = '23514';
  end if;
  if v_slot.status <> 'open' then
    raise exception 'This slot is no longer available' using errcode = '23514';
  end if;
  if v_slot.start_time <= now() then
    raise exception 'This slot has already started' using errcode = '23514';
  end if;
  if not public.is_verified_professional(v_uid) then
    raise exception 'Only verified professionals can accept requests' using errcode = '42501';
  end if;

  perform set_config('nexa.slot_system_write', 'on', true);
  update public.availability_slots set status = 'booked' where id = v_slot.id;
  perform set_config('nexa.slot_system_write', 'off', true);

  update public.mentorship_requests set status = 'accepted', decided_at = now() where id = p_request_id;

  -- everybody else who asked for this slot is told it is gone
  update public.mentorship_requests
     set status = 'declined', decided_at = now(),
         decline_reason = 'This slot was booked by another student'
   where availability_slot_id = v_slot.id and status = 'pending' and id <> p_request_id;
end;
$$;

-- ---------------------------------------------------------------------
-- decline_request(request_id, reason)      caller: the owning professional
-- The slot stays open.
-- ---------------------------------------------------------------------
create or replace function public.decline_request(p_request_id uuid, p_reason text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid    uuid := auth.uid();
  v_req    public.mentorship_requests%rowtype;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if v_uid is null or public.current_access_level() is distinct from 'professional' or not public.is_active_user() then
    raise exception 'Only active professionals can decline requests' using errcode = '42501';
  end if;
  if v_reason is not null and char_length(v_reason) > 500 then
    raise exception 'The reason must be 500 characters or fewer' using errcode = '22023';
  end if;

  select * into v_req from public.mentorship_requests where id = p_request_id for update;
  if not found or v_req.professional_id <> v_uid then
    raise exception 'Request not found' using errcode = 'P0002';
  end if;
  if v_req.status <> 'pending' then
    raise exception 'This request has already been answered' using errcode = '23514';
  end if;

  update public.mentorship_requests
     set status = 'declined', decline_reason = v_reason, decided_at = now()
   where id = p_request_id;
end;
$$;

-- ---------------------------------------------------------------------
-- cancel_session(request_id, reason)      caller: student or professional of the request
--   accepted request  -> either party; the slot reopens if it is still in the future
--   pending request   -> the student only (withdrawing it; professionals decline instead)
-- A session that has already started cannot be cancelled.
-- ---------------------------------------------------------------------
create or replace function public.cancel_session(p_request_id uuid, p_reason text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid    uuid := auth.uid();
  v_req    public.mentorship_requests%rowtype;
  v_slot   public.availability_slots%rowtype;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if v_uid is null or not public.is_active_user() then
    raise exception 'You must be signed in' using errcode = '42501';
  end if;
  if v_reason is not null and char_length(v_reason) > 500 then
    raise exception 'The reason must be 500 characters or fewer' using errcode = '22023';
  end if;

  select * into v_req from public.mentorship_requests where id = p_request_id;
  if not found or v_uid not in (v_req.student_id, v_req.professional_id) then
    raise exception 'Request not found' using errcode = 'P0002';
  end if;

  select * into v_slot from public.availability_slots where id = v_req.availability_slot_id for update;
  select * into v_req  from public.mentorship_requests where id = p_request_id for update;

  if v_req.status = 'pending' then
    if v_uid <> v_req.student_id then
      raise exception 'Decline the request instead of cancelling it' using errcode = '42501';
    end if;
  elsif v_req.status = 'accepted' then
    if v_slot.start_time <= now() then
      raise exception 'A session that has already started cannot be cancelled' using errcode = '23514';
    end if;
  else
    raise exception 'Only pending or accepted requests can be cancelled' using errcode = '23514';
  end if;

  update public.mentorship_requests
     set status = 'cancelled', cancel_reason = v_reason, cancelled_at = now()
   where id = p_request_id;

  if v_req.status = 'accepted' and v_slot.status = 'booked' then
    perform set_config('nexa.slot_system_write', 'on', true);
    update public.availability_slots set status = 'open' where id = v_slot.id;
    perform set_config('nexa.slot_system_write', 'off', true);
  end if;
end;
$$;

revoke all on function public.accept_request(uuid), public.decline_request(uuid, text), public.cancel_session(uuid, text)
  from public, anon, authenticated;
grant execute on function public.accept_request(uuid), public.decline_request(uuid, text), public.cancel_session(uuid, text)
  to authenticated;

-- ---------------------------------------------------------------------
-- upcoming_sessions: the caller's accepted sessions that have not ended yet.
-- security_invoker: RLS still applies. The meeting link comes from slot_links.
-- ---------------------------------------------------------------------
create or replace view public.upcoming_sessions with (security_invoker = true) as
select
  r.id                  as request_id,
  s.id                  as slot_id,
  r.student_id,
  sp.name               as student_name,
  r.professional_id,
  pr.name               as professional_name,
  s.start_time,
  s.end_time,
  l.meeting_url
from public.mentorship_requests r
join public.availability_slots s on s.id = r.availability_slot_id
join public.profiles sp on sp.id = r.student_id
join public.profiles pr on pr.id = r.professional_id
left join public.slot_links l on l.slot_id = s.id
where r.status = 'accepted'
  and s.end_time > now()
  and (r.student_id = auth.uid() or r.professional_id = auth.uid());

revoke all on public.upcoming_sessions from public, anon, authenticated;
grant select on public.upcoming_sessions to authenticated;

-- ---------------------------------------------------------------------
-- close_user_activity(user_id): used by the account-deletion Edge Functions (service role only).
-- Cancels what the user still has open so nobody is left waiting for a person who is gone:
--   as a student:       pending and accepted requests are cancelled (slots reopen)
--   as a professional:  future open/booked slots are removed (pending requests declined,
--                       accepted sessions cancelled), through the same code the admin uses
-- The other parties are notified by the Day 7 triggers once those exist.
-- ---------------------------------------------------------------------
create or replace function public.close_user_activity(p_user_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  r record;
begin
  for r in
    select q.id, q.status, q.availability_slot_id
    from public.mentorship_requests q
    where q.student_id = p_user_id and q.status in ('pending', 'accepted')
    for update
  loop
    update public.mentorship_requests
       set status = 'cancelled', cancel_reason = 'This account was closed', cancelled_at = now()
     where id = r.id;
    if r.status = 'accepted' then
      perform set_config('nexa.slot_system_write', 'on', true);
      update public.availability_slots set status = 'open'
       where id = r.availability_slot_id and status = 'booked' and start_time > now();
      perform set_config('nexa.slot_system_write', 'off', true);
    end if;
  end loop;

  for r in
    select s.id from public.availability_slots s
    where s.professional_id = p_user_id and s.status in ('open', 'booked') and s.end_time > now()
  loop
    perform public._remove_slot(r.id, 'This account was closed');
  end loop;
end;
$$;
revoke all on function public.close_user_activity(uuid) from public, anon, authenticated;
grant execute on function public.close_user_activity(uuid) to service_role;
