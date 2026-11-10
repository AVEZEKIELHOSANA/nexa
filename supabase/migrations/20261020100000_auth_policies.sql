-- =====================================================================
-- Nexa  |  Migration 002  |  Auth-phase RLS policies and grants
-- Day 2 of the build. Adds policies + table privileges for:
--   roles, careers, profiles, student_profiles,
--   student_career_interests, professional_profiles
-- Everything else stays deny-all until its own day.
-- =====================================================================

-- ---------------------------------------------------------------------
-- roles: readable by any logged-in user (needed to resolve access level
-- in the UI). Admin CRUD policies come on Day 4.
-- ---------------------------------------------------------------------
create policy "roles readable by authenticated"
  on public.roles for select
  to authenticated
  using (true);

grant select on public.roles to authenticated;

-- ---------------------------------------------------------------------
-- careers: public read (landing page shows live careers, sign-up forms
-- need the list). Admin write policies come on Day 4.
-- ---------------------------------------------------------------------
create policy "careers public read"
  on public.careers for select
  to anon, authenticated
  using (is_active or public.is_admin());

grant select on public.careers to anon, authenticated;

-- ---------------------------------------------------------------------
-- profiles: own row read/update; admins read all.
-- Inserts happen only through the handle_new_user trigger (definer).
-- ---------------------------------------------------------------------
create policy "profiles own read"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

create policy "profiles admin read"
  on public.profiles for select
  to authenticated
  using (public.is_admin());

create policy "profiles own update"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());
-- the guard_profile_changes trigger blocks role_id/is_active edits.

grant select, update on public.profiles to authenticated;
-- column-level tightening: only name is user-editable
revoke update on public.profiles from authenticated;
grant update (name) on public.profiles to authenticated;

-- ---------------------------------------------------------------------
-- student_profiles: own read/update (not guardian_consent_at — that is
-- only set by the consent function); admins read all.
-- ---------------------------------------------------------------------
create policy "student_profiles own read"
  on public.student_profiles for select
  to authenticated
  using (user_id = auth.uid());

create policy "student_profiles admin read"
  on public.student_profiles for select
  to authenticated
  using (public.is_admin());

create policy "student_profiles own update"
  on public.student_profiles for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select on public.student_profiles to authenticated;
grant update (date_of_birth, guardian_email, bio, notification_prefs)
  on public.student_profiles to authenticated;

-- ---------------------------------------------------------------------
-- student_career_interests: own read/insert/delete; admins read.
-- ---------------------------------------------------------------------
create policy "interests own read"
  on public.student_career_interests for select
  to authenticated
  using (student_id = auth.uid());

create policy "interests admin read"
  on public.student_career_interests for select
  to authenticated
  using (public.is_admin());

create policy "interests own insert"
  on public.student_career_interests for insert
  to authenticated
  with check (student_id = auth.uid());

create policy "interests own delete"
  on public.student_career_interests for delete
  to authenticated
  using (student_id = auth.uid());

grant select, insert, delete on public.student_career_interests to authenticated;

-- ---------------------------------------------------------------------
-- professional_profiles: own read; admins read all.
-- The public/verified directory view arrives on Day 5.
-- User-editable columns: bio, experience_years, career_id (while pending).
-- Verification columns only change via admin RPC on Day 4.
-- ---------------------------------------------------------------------
create policy "pro_profiles own read"
  on public.professional_profiles for select
  to authenticated
  using (user_id = auth.uid());

create policy "pro_profiles admin read"
  on public.professional_profiles for select
  to authenticated
  using (public.is_admin());

create policy "pro_profiles own update"
  on public.professional_profiles for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select on public.professional_profiles to authenticated;
grant update (bio, experience_years, career_id, credentials_path)
  on public.professional_profiles to authenticated;