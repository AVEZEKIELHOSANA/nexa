-- =====================================================================
-- Nexa  |  Migration Day 4  |  Admin core: users, roles, verification, careers
-- Tech Spec 2.1 (log_admin_action), 2.3 (policies), 2.4 (admin functions), 2.6 (credentials bucket)
--
-- Safe to run on top of the Day 2/3 migrations: every policy has its own
-- descriptive name and is dropped-if-exists before it is created, and every
-- grant is additive. Policies are permissive, so a policy you already have
-- from Day 2 and one of these simply both apply (OR).
--
-- Pattern used for every function in this file (and Days 5-8):
--   * SECURITY DEFINER + search_path pinned to '' (everything is schema-qualified)
--   * REVOKE from public/anon/authenticated, then GRANT only to who needs it.
--     (Supabase grants EXECUTE on new functions to anon/authenticated by default,
--     so the explicit revoke matters.)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Helpers
-- ---------------------------------------------------------------------

-- True when at least one profile uses this role. SECURITY DEFINER so the role
-- delete policy can ask the question without needing to read all profiles.
create or replace function public.role_has_users(p_role_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.profiles where role_id = p_role_id)
$$;
revoke all on function public.role_has_users(uuid) from public, anon, authenticated;
grant execute on function public.role_has_users(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 2. log_admin_action: the ONLY way a row gets into admin_activity_log
--    Called from other SECURITY DEFINER functions and triggers (as the
--    function owner, so no grant is needed) and by Edge Functions
--    (service role, passing the admin's id explicitly).
--    Nobody on the API (anon/authenticated) can call it directly, so an
--    admin cannot forge log entries.
-- ---------------------------------------------------------------------
create or replace function public.log_admin_action(
  p_action      text,
  p_target_type text  default null,
  p_target_id   uuid  default null,
  p_details     jsonb default '{}'::jsonb,
  p_admin_id    uuid  default null
)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.admin_activity_log (admin_id, action, target_type, target_id, details)
  values (coalesce(p_admin_id, auth.uid()), p_action, p_target_type, p_target_id, coalesce(p_details, '{}'::jsonb));
end;
$$;
revoke all on function public.log_admin_action(text, text, uuid, jsonb, uuid) from public, anon, authenticated;
grant execute on function public.log_admin_action(text, text, uuid, jsonb, uuid) to service_role;

-- The activity log is readable by admins only, and never writable from the API.
grant select on public.admin_activity_log to authenticated;
drop policy if exists "activity log: admin read" on public.admin_activity_log;
create policy "activity log: admin read" on public.admin_activity_log
  for select to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------
-- 3. roles: any signed-in user reads; admin manages non-system roles
-- ---------------------------------------------------------------------
grant select, insert, update, delete on public.roles to authenticated;

drop policy if exists "roles: signed-in read" on public.roles;
create policy "roles: signed-in read" on public.roles
  for select to authenticated using (true);

drop policy if exists "roles: admin insert" on public.roles;
create policy "roles: admin insert" on public.roles
  for insert to authenticated with check (public.is_admin() and not is_system);

drop policy if exists "roles: admin update custom" on public.roles;
create policy "roles: admin update custom" on public.roles
  for update to authenticated
  using (public.is_admin() and not is_system)
  with check (public.is_admin() and not is_system);

drop policy if exists "roles: admin delete unused custom" on public.roles;
create policy "roles: admin delete unused custom" on public.roles
  for delete to authenticated
  using (public.is_admin() and not is_system and not public.role_has_users(id));

-- A role's access level cannot change while people hold the role: that would
-- silently change what those people are allowed to do.
create or replace function public.guard_role_changes()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.access_level is distinct from old.access_level and public.role_has_users(old.id) then
    raise exception 'The access level of a role cannot change while users are assigned to it'
      using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_role_changes() from public, anon, authenticated;
drop trigger if exists guard_role_changes on public.roles;
create trigger guard_role_changes before update on public.roles
  for each row execute function public.guard_role_changes();

-- ---------------------------------------------------------------------
-- 4. careers: public read (also logged-out visitors); admin writes.
--    "Delete" means archive (is_active = false), so there is no delete policy.
-- ---------------------------------------------------------------------
grant select on public.careers to anon, authenticated;
grant insert, update on public.careers to authenticated;

drop policy if exists "careers: public read" on public.careers;
create policy "careers: public read" on public.careers
  for select to anon, authenticated using (true);

drop policy if exists "careers: admin insert" on public.careers;
create policy "careers: admin insert" on public.careers
  for insert to authenticated with check (public.is_admin());

drop policy if exists "careers: admin update" on public.careers;
create policy "careers: admin update" on public.careers
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- 5. Audit triggers: roles, careers and admin-made profile changes
--    Only fire when a signed-in ADMIN made the change. Service-role writes
--    (Edge Functions) log themselves through log_admin_action.
-- ---------------------------------------------------------------------
create or replace function public.log_role_change()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    return coalesce(new, old);
  end if;
  if tg_op = 'INSERT' then
    perform public.log_admin_action('role.create', 'role', new.id,
      jsonb_build_object('name', new.name, 'access_level', new.access_level));
  elsif tg_op = 'UPDATE' then
    perform public.log_admin_action('role.update', 'role', new.id,
      jsonb_build_object('name', new.name, 'previous_name', old.name,
                         'access_level', new.access_level, 'previous_access_level', old.access_level));
  else
    perform public.log_admin_action('role.delete', 'role', old.id,
      jsonb_build_object('name', old.name, 'access_level', old.access_level));
  end if;
  return coalesce(new, old);
end;
$$;
revoke all on function public.log_role_change() from public, anon, authenticated;
drop trigger if exists log_role_change on public.roles;
create trigger log_role_change after insert or update or delete on public.roles
  for each row execute function public.log_role_change();

create or replace function public.log_career_change()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    perform public.log_admin_action('career.create', 'career', new.id, jsonb_build_object('name', new.name));
  elsif new.is_active is distinct from old.is_active then
    perform public.log_admin_action(case when new.is_active then 'career.restore' else 'career.archive' end,
      'career', new.id, jsonb_build_object('name', new.name));
  else
    perform public.log_admin_action('career.update', 'career', new.id,
      jsonb_build_object('name', new.name, 'previous_name', old.name));
  end if;
  return new;
end;
$$;
revoke all on function public.log_career_change() from public, anon, authenticated;
drop trigger if exists log_career_change on public.careers;
create trigger log_career_change after insert or update on public.careers
  for each row execute function public.log_career_change();

-- ---------------------------------------------------------------------
-- 6. profiles: admin read/update, other safeguards
-- ---------------------------------------------------------------------
grant select on public.profiles to authenticated;
-- Column-level: nobody can touch deleted_at or id from the API (soft delete runs in an Edge Function).
grant update (name, role_id, is_active) on public.profiles to authenticated;

drop policy if exists "profiles: admin read" on public.profiles;
create policy "profiles: admin read" on public.profiles
  for select to authenticated using (public.is_admin());

drop policy if exists "profiles: admin update" on public.profiles;
create policy "profiles: admin update" on public.profiles
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Never leave the platform without an active administrator: blocks demoting,
-- deactivating, soft-deleting or deleting the last one (for every caller,
-- including the service role).
create or replace function public.protect_last_admin()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_old_level  text;
  v_new_level  text;
  v_others     integer;
  v_demoted    boolean;
begin
  select r.access_level into v_old_level from public.roles r where r.id = old.role_id;
  if v_old_level is distinct from 'admin' or not old.is_active or old.deleted_at is not null then
    return coalesce(new, old);                       -- the row is not an active admin today
  end if;

  if tg_op = 'DELETE' then
    v_demoted := true;
  else
    select r.access_level into v_new_level from public.roles r where r.id = new.role_id;
    v_demoted := v_new_level is distinct from 'admin' or not new.is_active or new.deleted_at is not null;
  end if;

  if v_demoted then
    select count(*) into v_others
    from public.profiles p
    join public.roles r on r.id = p.role_id
    where r.access_level = 'admin' and p.is_active and p.deleted_at is null and p.id <> old.id;
    if v_others = 0 then
      raise exception 'You cannot remove, demote or deactivate the last administrator'
        using errcode = '23514';
    end if;
  end if;
  return coalesce(new, old);
end;
$$;
revoke all on function public.protect_last_admin() from public, anon, authenticated;
drop trigger if exists protect_last_admin on public.profiles;
create trigger protect_last_admin before update or delete on public.profiles
  for each row execute function public.protect_last_admin();

-- Log role / status / name changes made by a signed-in admin.
create or replace function public.log_profile_admin_changes()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    return new;
  end if;
  if new.role_id is distinct from old.role_id then
    perform public.log_admin_action('user.change_role', 'user', new.id, jsonb_build_object(
      'name', new.name,
      'from', (select r.name from public.roles r where r.id = old.role_id),
      'to',   (select r.name from public.roles r where r.id = new.role_id)));
  end if;
  if new.is_active is distinct from old.is_active then
    perform public.log_admin_action(case when new.is_active then 'user.activate' else 'user.deactivate' end,
      'user', new.id, jsonb_build_object('name', new.name));
  end if;
  if new.name is distinct from old.name and auth.uid() <> new.id then
    perform public.log_admin_action('user.rename', 'user', new.id,
      jsonb_build_object('from', old.name, 'to', new.name));
  end if;
  return new;
end;
$$;
revoke all on function public.log_profile_admin_changes() from public, anon, authenticated;
drop trigger if exists log_profile_admin_changes on public.profiles;
create trigger log_profile_admin_changes after update on public.profiles
  for each row execute function public.log_profile_admin_changes();

-- ---------------------------------------------------------------------
-- 7. professional_profiles: reads, and the verification fields locked down
-- ---------------------------------------------------------------------
grant select on public.professional_profiles to authenticated;
-- A professional may change only these columns; verification fields are never writable from the API.
grant update (bio, experience_years, career_id, credentials_path) on public.professional_profiles to authenticated;

drop policy if exists "professional_profiles: read own" on public.professional_profiles;
create policy "professional_profiles: read own" on public.professional_profiles
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "professional_profiles: admin read" on public.professional_profiles;
create policy "professional_profiles: admin read" on public.professional_profiles
  for select to authenticated using (public.is_admin());

drop policy if exists "professional_profiles: update own details" on public.professional_profiles;
create policy "professional_profiles: update own details" on public.professional_profiles
  for update to authenticated
  using (user_id = auth.uid() and public.is_active_user())
  with check (user_id = auth.uid());

-- Defence in depth on top of the column grants: only an admin (or the service
-- role) can change the verification fields. Also: when a REJECTED professional
-- uploads a new credentials file, the application goes back to pending.
create or replace function public.guard_professional_changes()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if new.verification_status is distinct from old.verification_status
       or new.rejection_reason is distinct from old.rejection_reason
       or new.verified_by      is distinct from old.verified_by
       or new.verified_at      is distinct from old.verified_at
       or new.user_id          is distinct from old.user_id then
      raise exception 'Only an administrator can change verification details'
        using errcode = '42501';
    end if;
    if new.credentials_path is distinct from old.credentials_path
       and old.verification_status = 'rejected' then
      new.verification_status := 'pending';
      new.rejection_reason := null;
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.guard_professional_changes() from public, anon, authenticated;
drop trigger if exists guard_professional_changes on public.professional_profiles;
create trigger guard_professional_changes before update on public.professional_profiles
  for each row execute function public.guard_professional_changes();

-- ---------------------------------------------------------------------
-- 8. verify_professional / reject_professional
--    (notifications to the professional are added by Day 7 through a trigger)
-- ---------------------------------------------------------------------
create or replace function public.verify_professional(p_user_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_old text;
begin
  if not public.is_admin() then
    raise exception 'Only an administrator can verify professionals' using errcode = '42501';
  end if;

  select pp.verification_status into v_old
  from public.professional_profiles pp
  join public.profiles p on p.id = pp.user_id
  where pp.user_id = p_user_id and p.deleted_at is null
  for update of pp;
  if not found then
    raise exception 'Professional not found' using errcode = 'P0002';
  end if;

  update public.professional_profiles
     set verification_status = 'verified', rejection_reason = null,
         verified_by = auth.uid(), verified_at = now()
   where user_id = p_user_id;

  perform public.log_admin_action('professional.verify', 'professional', p_user_id,
    jsonb_build_object('previous_status', v_old,
                       'name', (select name from public.profiles where id = p_user_id)));
end;
$$;

create or replace function public.reject_professional(p_user_id uuid, p_reason text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_old    text;
  v_reason text := btrim(coalesce(p_reason, ''));
begin
  if not public.is_admin() then
    raise exception 'Only an administrator can reject professionals' using errcode = '42501';
  end if;
  if char_length(v_reason) < 5 then
    raise exception 'Please give a reason of at least 5 characters' using errcode = '22023';
  end if;
  if char_length(v_reason) > 500 then
    raise exception 'The reason must be 500 characters or fewer' using errcode = '22023';
  end if;

  select pp.verification_status into v_old
  from public.professional_profiles pp
  join public.profiles p on p.id = pp.user_id
  where pp.user_id = p_user_id and p.deleted_at is null
  for update of pp;
  if not found then
    raise exception 'Professional not found' using errcode = 'P0002';
  end if;

  update public.professional_profiles
     set verification_status = 'rejected', rejection_reason = v_reason,
         verified_by = auth.uid(), verified_at = now()
   where user_id = p_user_id;

  perform public.log_admin_action('professional.reject', 'professional', p_user_id,
    jsonb_build_object('previous_status', v_old, 'reason', v_reason,
                       'name', (select name from public.profiles where id = p_user_id)));
end;
$$;

revoke all on function public.verify_professional(uuid), public.reject_professional(uuid, text)
  from public, anon, authenticated;
grant execute on function public.verify_professional(uuid), public.reject_professional(uuid, text)
  to authenticated;

-- ---------------------------------------------------------------------
-- 9. admin_list_users / admin_list_professionals
--    The only place an email address is exposed (it lives in auth.users).
--    Paginated; every row carries total_count so the UI can draw pages.
-- ---------------------------------------------------------------------
create or replace function public.admin_list_users(
  p_search          text    default null,
  p_role_id         uuid    default null,
  p_active          boolean default null,
  p_page            integer default 1,
  p_page_size       integer default 20,
  p_access_level    text    default null,
  p_sort            text    default 'created_at',
  p_desc            boolean default true,
  p_include_deleted boolean default false
)
returns table (
  id              uuid,
  name            text,
  email           text,
  role_id         uuid,
  role_name       text,
  access_level    text,
  is_active       boolean,
  deleted_at      timestamptz,
  created_at      timestamptz,
  last_sign_in_at timestamptz,
  email_confirmed boolean,
  total_count     bigint
)
language plpgsql stable security definer set search_path = ''
as $$
#variable_conflict use_column
declare
  v_page integer := greatest(coalesce(p_page, 1), 1);
  v_size integer := least(greatest(coalesce(p_page_size, 20), 1), 100);
  v_q    text    := lower(nullif(btrim(p_search), ''));
  v_sort text    := coalesce(p_sort, 'created_at');
  v_desc boolean := coalesce(p_desc, true);
begin
  if not public.is_admin() then
    raise exception 'Only an administrator can list users' using errcode = '42501';
  end if;

  return query
  with filtered as (
    select p.id, p.name, u.email::text as email, p.role_id, r.name as role_name, r.access_level,
           p.is_active, p.deleted_at, p.created_at, u.last_sign_in_at,
           (u.email_confirmed_at is not null) as email_confirmed
    from public.profiles p
    join public.roles r on r.id = p.role_id
    join auth.users u on u.id = p.id
    where (p_include_deleted or p.deleted_at is null)
      and (p_role_id is null or p.role_id = p_role_id)
      and (p_access_level is null or r.access_level = p_access_level)
      and (p_active is null or (p.is_active and p.deleted_at is null) = p_active)
      and (v_q is null
           or strpos(lower(p.name), v_q) > 0
           or strpos(lower(coalesce(u.email::text, '')), v_q) > 0)
  )
  select f.id, f.name, f.email, f.role_id, f.role_name, f.access_level, f.is_active, f.deleted_at,
         f.created_at, f.last_sign_in_at, f.email_confirmed, count(*) over () as total_count
  from filtered f
  order by
    case when v_sort = 'name'       and not v_desc then lower(f.name) end asc,
    case when v_sort = 'name'       and v_desc     then lower(f.name) end desc,
    case when v_sort = 'email'      and not v_desc then lower(f.email) end asc,
    case when v_sort = 'email'      and v_desc     then lower(f.email) end desc,
    case when v_sort = 'role'       and not v_desc then lower(f.role_name) end asc,
    case when v_sort = 'role'       and v_desc     then lower(f.role_name) end desc,
    case when v_sort = 'created_at' and not v_desc then f.created_at end asc,
    case when v_sort = 'created_at' and v_desc     then f.created_at end desc,
    f.created_at desc, f.id
  offset (v_page - 1) * v_size
  limit v_size;
end;
$$;

create or replace function public.admin_list_professionals(
  p_status    text    default null,        -- pending | verified | rejected | null = all
  p_search    text    default null,
  p_career_id uuid    default null,
  p_page      integer default 1,
  p_page_size integer default 20
)
returns table (
  user_id             uuid,
  name                text,
  email               text,
  is_active           boolean,
  career_id           uuid,
  career_name         text,
  experience_years    integer,
  bio                 text,
  has_credentials     boolean,
  verification_status text,
  rejection_reason    text,
  verified_at         timestamptz,
  applied_at          timestamptz,
  total_count         bigint
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
    raise exception 'Only an administrator can list professionals' using errcode = '42501';
  end if;
  if p_status is not null and p_status not in ('pending', 'verified', 'rejected') then
    raise exception 'Unknown status %', p_status using errcode = '22023';
  end if;

  return query
  select pp.user_id, p.name, u.email::text, p.is_active, pp.career_id, c.name,
         pp.experience_years, pp.bio, (pp.credentials_path is not null), pp.verification_status,
         pp.rejection_reason, pp.verified_at, p.created_at, count(*) over () as total_count
  from public.professional_profiles pp
  join public.profiles p on p.id = pp.user_id
  join public.careers c on c.id = pp.career_id
  join auth.users u on u.id = pp.user_id
  where p.deleted_at is null
    and (p_status is null or pp.verification_status = p_status)
    and (p_career_id is null or pp.career_id = p_career_id)
    and (v_q is null
         or strpos(lower(p.name), v_q) > 0
         or strpos(lower(coalesce(u.email::text, '')), v_q) > 0)
  order by
    case when pp.verification_status = 'pending' then p.created_at end asc nulls last,
    pp.verified_at desc nulls last,
    p.created_at desc, pp.user_id
  offset (v_page - 1) * v_size
  limit v_size;
end;
$$;

revoke all on function public.admin_list_users(text, uuid, boolean, integer, integer, text, text, boolean, boolean)
  from public, anon, authenticated;
grant execute on function public.admin_list_users(text, uuid, boolean, integer, integer, text, text, boolean, boolean)
  to authenticated;
revoke all on function public.admin_list_professionals(text, text, uuid, integer, integer)
  from public, anon, authenticated;
grant execute on function public.admin_list_professionals(text, text, uuid, integer, integer)
  to authenticated;

-- ---------------------------------------------------------------------
-- 10. user_has_linked_records: used by the admin-delete-user Edge Function to
--     decide between a hard delete (nothing references the user) and a soft delete.
-- ---------------------------------------------------------------------
create or replace function public.user_has_linked_records(p_user_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.mentorship_requests where student_id = p_user_id or professional_id = p_user_id)
      or exists (select 1 from public.availability_slots  where professional_id = p_user_id)
      or exists (select 1 from public.messages            where sender_id = p_user_id)
      or exists (select 1 from public.reports             where reporter_id = p_user_id or resolved_by = p_user_id or target_id = p_user_id)
      or exists (select 1 from public.peer_connections    where requester_id = p_user_id or recipient_id = p_user_id)
      or exists (select 1 from public.course_progress     where student_id = p_user_id)
      or exists (select 1 from public.professional_profiles where verified_by = p_user_id)
      or exists (select 1 from public.admin_activity_log  where admin_id = p_user_id)
$$;
revoke all on function public.user_has_linked_records(uuid) from public, anon, authenticated;
grant execute on function public.user_has_linked_records(uuid) to service_role;

-- ---------------------------------------------------------------------
-- 11. Storage: private "credentials" bucket
--     A professional writes only into their own folder (<user id>/...).
--     Read: the owner and admins (admins use short-lived signed URLs).
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('credentials', 'credentials', false, 5242880,
        array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "credentials: owner uploads" on storage.objects;
create policy "credentials: owner uploads" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'credentials'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.current_access_level() = 'professional'
    and public.is_active_user()
  );

drop policy if exists "credentials: owner or admin reads" on storage.objects;
create policy "credentials: owner or admin reads" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'credentials'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

drop policy if exists "credentials: owner replaces" on storage.objects;
create policy "credentials: owner replaces" on storage.objects
  for update to authenticated
  using (bucket_id = 'credentials' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'credentials' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "credentials: owner deletes" on storage.objects;
create policy "credentials: owner deletes" on storage.objects
  for delete to authenticated
  using (bucket_id = 'credentials' and (storage.foldername(name))[1] = auth.uid()::text);

