-- =====================================================================
-- Nexa  |  Migration Day 10  |  Settings, admin dashboard, reminders
-- Tech Spec: admin_stats, session_reminders (pg_cron), notification_prefs, own-profile editing,
--            admin-change logging (courses added to the Day 4 triggers).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Own profile: a person may change their own NAME (role, status and deleted_at stay locked by
--    the Day 1 trigger guard_profile_changes, which still runs for every update).
-- ---------------------------------------------------------------------
drop policy if exists "profiles: update own name" on public.profiles;
create policy "profiles: update own name" on public.profiles
  for update to authenticated
  using (id = auth.uid() and public.is_active_user())
  with check (id = auth.uid());

-- ---------------------------------------------------------------------
-- 2. Student profile: read your own (admins read all). Writes go through
--    update_my_student_settings() so bio, interests and preferences are validated in one place.
--    date_of_birth, guardian_email and the consent date are never writable from the API.
-- ---------------------------------------------------------------------
grant select on public.student_profiles, public.student_career_interests to authenticated;

drop policy if exists "student_profiles: read own" on public.student_profiles;
create policy "student_profiles: read own" on public.student_profiles
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "student_profiles: admin read" on public.student_profiles;
create policy "student_profiles: admin read" on public.student_profiles
  for select to authenticated using (public.is_admin());

drop policy if exists "student_interests: read own" on public.student_career_interests;
create policy "student_interests: read own" on public.student_career_interests
  for select to authenticated using (student_id = auth.uid());

drop policy if exists "student_interests: admin read" on public.student_career_interests;
create policy "student_interests: admin read" on public.student_career_interests
  for select to authenticated using (public.is_admin());

-- update_my_student_settings(bio, interest ids, preferences)   caller: an active student
--   preferences: { "messages": bool, "reminders": bool, "peers": bool }  (anything else is rejected)
create or replace function public.update_my_student_settings(p_bio text, p_interest_ids uuid[], p_prefs jsonb)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_me    uuid := auth.uid();
  v_bio   text := nullif(btrim(coalesce(p_bio, '')), '');
  v_ids   uuid[] := coalesce(p_interest_ids, '{}'::uuid[]);
  v_key   text;
  v_clean jsonb := '{}'::jsonb;
begin
  if v_me is null or public.current_access_level() is distinct from 'student' or not public.is_active_user() then
    raise exception 'Only an active student can change these settings' using errcode = '42501';
  end if;
  if v_bio is not null and char_length(v_bio) > 1000 then
    raise exception 'Your bio is limited to 1000 characters' using errcode = '22023';
  end if;

  select coalesce(array_agg(distinct x), '{}') into v_ids from unnest(v_ids) as t(x);
  if coalesce(array_length(v_ids, 1), 0) > 10 then
    raise exception 'Choose at most 10 career interests' using errcode = '22023';
  end if;
  -- only careers that exist and are active, or ones the student already had
  if exists (
    select 1 from unnest(v_ids) as t(x)
    where not exists (select 1 from public.careers c where c.id = t.x
                       and (c.is_active or exists (select 1 from public.student_career_interests i
                                                    where i.student_id = v_me and i.career_id = c.id)))
  ) then
    raise exception 'One of the chosen careers is not available' using errcode = '22023';
  end if;

  if p_prefs is not null then
    if jsonb_typeof(p_prefs) <> 'object' then
      raise exception 'Invalid notification preferences' using errcode = '22023';
    end if;
    for v_key in select jsonb_object_keys(p_prefs) loop
      if v_key not in ('messages', 'reminders', 'peers') or jsonb_typeof(p_prefs -> v_key) <> 'boolean' then
        raise exception 'Invalid notification preferences' using errcode = '22023';
      end if;
      v_clean := v_clean || jsonb_build_object(v_key, p_prefs -> v_key);
    end loop;
  end if;

  update public.student_profiles
     set bio = v_bio,
         notification_prefs = case when p_prefs is null then notification_prefs else v_clean end
   where user_id = v_me;
  if not found then
    raise exception 'Student profile not found' using errcode = 'P0002';
  end if;

  delete from public.student_career_interests where student_id = v_me and career_id <> all (v_ids);
  insert into public.student_career_interests (student_id, career_id)
    select v_me, x from unnest(v_ids) as t(x)
  on conflict do nothing;
end;
$$;
revoke all on function public.update_my_student_settings(text, uuid[], jsonb) from public, anon;
grant execute on function public.update_my_student_settings(text, uuid[], jsonb) to authenticated;

-- ---------------------------------------------------------------------
-- 3. notify() honours notification_prefs. Only chatty categories can be switched off; request
--    decisions, cancellations and verification results are always delivered.
-- ---------------------------------------------------------------------
create or replace function public.notify(p_user_id uuid, p_type text, p_payload jsonb default '{}'::jsonb)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_category text;
begin
  if p_user_id is null then
    return;
  end if;
  v_category := case p_type
    when 'new_message'      then 'messages'
    when 'session_reminder' then 'reminders'
    when 'peer_request'     then 'peers'
    when 'peer_connected'   then 'peers'
  end;
  if v_category is not null and exists (
    select 1 from public.student_profiles sp
    where sp.user_id = p_user_id and (sp.notification_prefs ->> v_category) = 'false'
  ) then
    return;
  end if;
  insert into public.notifications (user_id, type, payload)
  values (p_user_id, p_type, coalesce(p_payload, '{}'::jsonb));
end;
$$;
revoke all on function public.notify(uuid, text, jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 4. Session reminders: once, for accepted sessions that start within 24 hours.
--    Runs hourly from pg_cron (scheduled below when the extension is available).
-- ---------------------------------------------------------------------
alter table public.mentorship_requests add column if not exists reminder_sent_at timestamptz;

create or replace function public.send_session_reminders()
returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  r record;
  v_count integer := 0;
begin
  for r in
    select mr.id, mr.student_id, mr.professional_id, s.start_time,
           (select name from public.profiles where id = mr.student_id)      as student_name,
           (select name from public.profiles where id = mr.professional_id) as professional_name
    from public.mentorship_requests mr
    join public.availability_slots s on s.id = mr.availability_slot_id
    where mr.status = 'accepted'
      and mr.reminder_sent_at is null
      and s.start_time > now()
      and s.start_time <= now() + interval '24 hours'
    order by s.start_time
    for update of mr skip locked
  loop
    update public.mentorship_requests set reminder_sent_at = now() where id = r.id;
    perform public.notify(r.student_id, 'session_reminder', jsonb_build_object(
      'request_id', r.id, 'start_time', r.start_time, 'professional_name', r.professional_name, 'student_name', r.student_name));
    perform public.notify(r.professional_id, 'session_reminder', jsonb_build_object(
      'request_id', r.id, 'start_time', r.start_time, 'professional_name', r.professional_name, 'student_name', r.student_name));
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;
revoke all on function public.send_session_reminders() from public, anon, authenticated;
grant execute on function public.send_session_reminders() to service_role;

-- Hourly schedule. pg_cron must be enabled for the project (Dashboard > Database > Extensions).
-- If it is not, this migration still succeeds and prints a notice; enable it and re-run this block.
do $$
begin
  begin
    create extension if not exists pg_cron;
  exception when others then
    raise notice 'pg_cron could not be enabled here (%): the reminder job was not scheduled', sqlerrm;
  end;
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if exists (select 1 from cron.job where jobname = 'nexa-session-reminders') then
      perform cron.unschedule('nexa-session-reminders');
    end if;
    perform cron.schedule('nexa-session-reminders', '0 * * * *', 'select public.send_session_reminders()');
  else
    raise notice 'pg_cron is not installed: session reminders will not run until it is';
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 5. Admin dashboard numbers
-- ---------------------------------------------------------------------
create or replace function public.admin_stats()
returns table (
  students              bigint,
  professionals         bigint,
  admins                bigint,
  new_users_7d          bigint,
  awaiting_consent      bigint,
  pending_verifications bigint,
  open_reports          bigint,
  pending_requests      bigint,
  upcoming_sessions     bigint,
  completed_sessions    bigint,
  messages_7d           bigint,
  published_courses     bigint,
  course_completions    bigint,
  peer_connections      bigint
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only an administrator can read the statistics' using errcode = '42501';
  end if;
  return query
  select
    (select count(*) from public.profiles p join public.roles r on r.id = p.role_id
      where r.access_level = 'student' and p.is_active and p.deleted_at is null),
    (select count(*) from public.profiles p join public.roles r on r.id = p.role_id
      where r.access_level = 'professional' and p.is_active and p.deleted_at is null),
    (select count(*) from public.profiles p join public.roles r on r.id = p.role_id
      where r.access_level = 'admin' and p.is_active and p.deleted_at is null),
    (select count(*) from public.profiles where deleted_at is null and created_at > now() - interval '7 days'),
    (select count(*) from public.student_profiles sp join public.profiles p on p.id = sp.user_id
      join public.roles r on r.id = p.role_id and r.access_level = 'student'
      where p.deleted_at is null and sp.guardian_consent_at is null
        and sp.date_of_birth > (current_date - interval '18 years')::date),
    (select count(*) from public.professional_profiles pp join public.profiles p on p.id = pp.user_id
      where pp.verification_status = 'pending' and p.deleted_at is null),
    (select count(*) from public.reports where status = 'open'),
    (select count(*) from public.mentorship_requests where status = 'pending'),
    (select count(*) from public.mentorship_requests mr join public.availability_slots s on s.id = mr.availability_slot_id
      where mr.status = 'accepted' and s.end_time > now()),
    (select count(*) from public.mentorship_requests mr join public.availability_slots s on s.id = mr.availability_slot_id
      where mr.status = 'accepted' and s.end_time <= now()),
    (select count(*) from public.messages where deleted_at is null and created_at > now() - interval '7 days'),
    (select count(*) from public.courses where is_published),
    (select count(*) from public.course_progress),
    (select count(*) from public.peer_connections where status = 'connected');
end;
$$;
revoke all on function public.admin_stats() from public, anon, authenticated;
grant execute on function public.admin_stats() to authenticated;

-- Sign-ups per day for the last p_days days (zero days included), day boundaries in p_tz.
create or replace function public.admin_signups_by_day(p_days integer default 14, p_tz text default 'Africa/Douala')
returns table (day date, students bigint, professionals bigint)
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_days integer := least(greatest(coalesce(p_days, 14), 1), 90);
  v_today date := (now() at time zone p_tz)::date;
begin
  if not public.is_admin() then
    raise exception 'Only an administrator can read the statistics' using errcode = '42501';
  end if;
  return query
  select d::date,
         count(*) filter (where r.access_level = 'student'),
         count(*) filter (where r.access_level = 'professional')
  from generate_series(v_today - (v_days - 1), v_today, interval '1 day') as d
  left join public.profiles p on p.deleted_at is null and (p.created_at at time zone p_tz)::date = d::date
  left join public.roles r on r.id = p.role_id
  group by d
  order by d;
end;
$$;
revoke all on function public.admin_signups_by_day(integer, text) from public, anon, authenticated;
grant execute on function public.admin_signups_by_day(integer, text) to authenticated;

-- ---------------------------------------------------------------------
-- 6. admin_list_students: students with age band and consent state (never the date of birth)
--    p_status: active | inactive | awaiting_consent
-- ---------------------------------------------------------------------
create or replace function public.admin_list_students(
  p_search    text    default null,
  p_status    text    default null,
  p_page      integer default 1,
  p_page_size integer default 20
)
returns table (
  id               uuid,
  name             text,
  email            text,
  is_active        boolean,
  is_minor         boolean,
  consent_status   text,
  interest_count   integer,
  courses_completed integer,
  sessions_count   integer,
  created_at       timestamptz,
  last_sign_in_at  timestamptz,
  total_count      bigint
)
language plpgsql stable security definer set search_path = ''
as $$
#variable_conflict use_column
declare
  v_page integer := greatest(coalesce(p_page, 1), 1);
  v_size integer := least(greatest(coalesce(p_page_size, 20), 1), 100);
  v_q    text    := lower(nullif(btrim(p_search), ''));
begin
  if not public.is_admin() then
    raise exception 'Only an administrator can list students' using errcode = '42501';
  end if;
  if p_status is not null and p_status not in ('active', 'inactive', 'awaiting_consent') then
    raise exception 'Unknown status %', p_status using errcode = '22023';
  end if;

  return query
  with base as (
    select p.id, p.name, u.email::text as email, p.is_active, p.created_at, u.last_sign_in_at,
           (sp.date_of_birth > (current_date - interval '18 years')::date) as is_minor,
           sp.guardian_consent_at
    from public.student_profiles sp
    join public.profiles p on p.id = sp.user_id
    join public.roles r on r.id = p.role_id and r.access_level = 'student'
    join auth.users u on u.id = p.id
    where p.deleted_at is null
      and (v_q is null or strpos(lower(p.name), v_q) > 0 or strpos(lower(coalesce(u.email::text, '')), v_q) > 0)
  ), shaped as (
    select b.*,
           case when not b.is_minor then 'not_needed'
                when b.guardian_consent_at is not null then 'given'
                else 'awaiting' end as consent_status
    from base b
  )
  select s.id, s.name, s.email, s.is_active, s.is_minor, s.consent_status,
         (select count(*)::integer from public.student_career_interests i where i.student_id = s.id),
         (select count(*)::integer from public.course_progress cp where cp.student_id = s.id),
         (select count(*)::integer from public.mentorship_requests mr where mr.student_id = s.id and mr.status = 'accepted'),
         s.created_at, s.last_sign_in_at,
         count(*) over () as total_count
  from shaped s
  where (p_status is null
         or (p_status = 'active' and s.is_active)
         or (p_status = 'inactive' and not s.is_active and s.consent_status <> 'awaiting')
         or (p_status = 'awaiting_consent' and s.consent_status = 'awaiting'))
  order by s.created_at desc, s.id
  offset (v_page - 1) * v_size
  limit v_size;
end;
$$;
revoke all on function public.admin_list_students(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.admin_list_students(text, text, integer, integer) to authenticated;

-- ---------------------------------------------------------------------
-- 7. Audit: courses are logged like roles and careers (only when a signed-in admin changes them)
-- ---------------------------------------------------------------------
create or replace function public.log_course_change()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    return coalesce(new, old);
  end if;
  if tg_op = 'INSERT' then
    perform public.log_admin_action('course.create', 'course', new.id, jsonb_build_object('title', new.title, 'published', new.is_published));
  elsif tg_op = 'DELETE' then
    perform public.log_admin_action('course.delete', 'course', old.id, jsonb_build_object('title', old.title));
  elsif new.is_published is distinct from old.is_published then
    perform public.log_admin_action(case when new.is_published then 'course.publish' else 'course.unpublish' end,
      'course', new.id, jsonb_build_object('title', new.title));
  elsif new.title is distinct from old.title or new.topic is distinct from old.topic
     or new.content is distinct from old.content or new.estimated_minutes is distinct from old.estimated_minutes then
    perform public.log_admin_action('course.update', 'course', new.id, jsonb_build_object('title', new.title));
  end if;
  return coalesce(new, old);
end;
$$;
revoke all on function public.log_course_change() from public, anon, authenticated;
drop trigger if exists log_course_change on public.courses;
create trigger log_course_change after insert or update or delete on public.courses
  for each row execute function public.log_course_change();
