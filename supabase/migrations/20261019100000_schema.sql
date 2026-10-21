-- =====================================================================
-- Nexa  |  Migration 001  |  Schema, helpers, signup trigger, seeds
-- Tech Spec Sections 1 and 2.1.  Day 1 of the 11-day build.
--
-- Security posture: every table has RLS enabled and NO policies in this
-- file, so the API can read or write nothing until a later migration adds
-- a policy for it (deny by default). Table privileges are also revoked
-- from anon/authenticated and re-granted per table, column by column,
-- alongside each table's policies.
-- =====================================================================

create extension if not exists btree_gist with schema extensions;

-- ---------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------

create table public.roles (
  id           uuid primary key default gen_random_uuid(),
  name         text not null unique check (char_length(name) between 2 and 50),
  description  text,
  access_level text not null check (access_level in ('student', 'professional', 'admin')),
  is_system    boolean not null default false,
  created_at   timestamptz not null default now()
);

create table public.careers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique check (char_length(name) between 2 and 100),
  description text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- One row per login. No email column: the email stays in auth.users.
create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 100),
  role_id    uuid not null references public.roles (id),
  is_active  boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.student_profiles (
  user_id             uuid primary key references public.profiles (id) on delete cascade,
  date_of_birth       date not null,
  guardian_email      text,
  guardian_consent_at timestamptz,
  bio                 text check (char_length(bio) <= 1000),
  notification_prefs  jsonb not null default '{}'::jsonb
);

create table public.student_career_interests (
  student_id uuid not null references public.student_profiles (user_id) on delete cascade,
  career_id  uuid not null references public.careers (id),
  primary key (student_id, career_id)
);

-- token_hash only ever holds a hash. No client access at all.
create table public.guardian_consents (
  id             uuid primary key default gen_random_uuid(),
  student_id     uuid not null references public.profiles (id) on delete cascade,
  guardian_email text not null,
  token_hash     text not null unique,
  expires_at     timestamptz not null,
  used_at        timestamptz,
  created_at     timestamptz not null default now()
);

create table public.professional_profiles (
  user_id             uuid primary key references public.profiles (id) on delete cascade,
  career_id           uuid not null references public.careers (id),
  bio                 text check (char_length(bio) <= 2000),
  experience_years    integer check (experience_years between 0 and 70),
  credentials_path    text,
  verification_status text not null default 'pending'
                      check (verification_status in ('pending', 'verified', 'rejected')),
  rejection_reason    text,
  verified_by         uuid references public.profiles (id),
  verified_at         timestamptz
);

create table public.availability_slots (
  id              uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.profiles (id) on delete cascade,
  start_time      timestamptz not null,
  end_time        timestamptz not null,
  meeting_url     text,
  status          text not null default 'open' check (status in ('open', 'booked', 'cancelled')),
  created_at      timestamptz not null default now(),
  constraint slot_end_after_start check (end_time > start_time),
  -- A professional cannot have two overlapping slots (cancelled ones are ignored).
  constraint slot_no_overlap exclude using gist (
    professional_id with =,
    tstzrange(start_time, end_time) with &&
  ) where (status <> 'cancelled')
);

create table public.mentorship_requests (
  id                   uuid primary key default gen_random_uuid(),
  student_id           uuid not null references public.profiles (id) on delete cascade,
  professional_id      uuid not null references public.profiles (id) on delete cascade,
  availability_slot_id uuid not null references public.availability_slots (id),
  message              text check (char_length(message) <= 1000),
  status               text not null default 'pending'
                       check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  decline_reason       text,
  cancel_reason        text,
  created_at           timestamptz not null default now(),
  decided_at           timestamptz
);

create table public.messages (
  id                    uuid primary key default gen_random_uuid(),
  mentorship_request_id uuid not null references public.mentorship_requests (id) on delete cascade,
  sender_id             uuid not null references public.profiles (id),
  body                  text not null check (char_length(body) between 1 and 2000),
  read_at               timestamptz,
  created_at            timestamptz not null default now(),
  deleted_at            timestamptz
);

create table public.courses (
  id                uuid primary key default gen_random_uuid(),
  title             text not null check (char_length(title) between 1 and 200),
  topic             text,
  content           text,
  estimated_minutes integer check (estimated_minutes > 0),
  is_published      boolean not null default false,
  asset_paths       text[] not null default '{}',
  created_at        timestamptz not null default now()
);

create table public.course_progress (
  student_id   uuid not null references public.profiles (id) on delete cascade,
  course_id    uuid not null references public.courses (id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (student_id, course_id)
);

create table public.peer_connections (
  id           uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  status       text not null default 'pending' check (status in ('pending', 'connected', 'declined')),
  created_at   timestamptz not null default now(),
  constraint peer_not_self check (requester_id <> recipient_id)
);

create table public.reports (
  id               uuid primary key default gen_random_uuid(),
  reporter_id      uuid not null references public.profiles (id) on delete cascade,
  target_type      text not null check (target_type in ('professional', 'student', 'message')),
  target_id        uuid not null,
  reason           text not null check (char_length(reason) between 1 and 2000),
  status           text not null default 'open' check (status in ('open', 'resolved')),
  resolved_by      uuid references public.profiles (id),
  resolution_notes text,
  resolved_at      timestamptz,
  created_at       timestamptz not null default now()
);

create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  type       text not null,
  payload    jsonb not null default '{}'::jsonb,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

-- Insert-only audit trail: later migrations create no update/delete policy for anyone.
create table public.admin_activity_log (
  id          uuid primary key default gen_random_uuid(),
  admin_id    uuid references public.profiles (id) on delete set null,
  action      text not null,
  target_type text,
  target_id   uuid,
  details     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 2. Indexes (every foreign key, plus the columns we filter on)
-- ---------------------------------------------------------------------

create index profiles_role_id_idx                on public.profiles (role_id);
create index student_interests_career_idx        on public.student_career_interests (career_id);
create index guardian_consents_student_idx       on public.guardian_consents (student_id);
create index professional_profiles_career_idx    on public.professional_profiles (career_id, verification_status);
create index professional_profiles_verifier_idx  on public.professional_profiles (verified_by);
create index slots_professional_start_idx        on public.availability_slots (professional_id, start_time);
create index slots_status_start_idx              on public.availability_slots (status, start_time);
create index requests_student_idx                on public.mentorship_requests (student_id, status);
create index requests_professional_idx           on public.mentorship_requests (professional_id, status);
create index requests_slot_idx                   on public.mentorship_requests (availability_slot_id);
create index messages_thread_idx                 on public.messages (mentorship_request_id, created_at);
create index messages_sender_idx                 on public.messages (sender_id);
create index course_progress_course_idx          on public.course_progress (course_id);
create index peer_connections_requester_idx     on public.peer_connections (requester_id);
create index peer_connections_recipient_idx      on public.peer_connections (recipient_id);
create index reports_reporter_idx                on public.reports (reporter_id);
create index reports_resolver_idx                on public.reports (resolved_by);
create index reports_status_idx                  on public.reports (status, created_at);
create index notifications_user_idx              on public.notifications (user_id, created_at desc);
create index notifications_unread_idx            on public.notifications (user_id) where read_at is null;
create index activity_log_admin_idx              on public.admin_activity_log (admin_id, created_at desc);

-- Business rules enforced by the database itself:
-- only one accepted request can ever hold a slot,
create unique index requests_one_accepted_per_slot
  on public.mentorship_requests (availability_slot_id) where status = 'accepted';
-- a student cannot have two pending requests on the same slot,
create unique index requests_one_pending_per_student_slot
  on public.mentorship_requests (student_id, availability_slot_id) where status = 'pending';
-- and a pair of students can be connected only once, in either direction.
create unique index peer_connections_unique_pair
  on public.peer_connections (least(requester_id, recipient_id), greatest(requester_id, recipient_id));

-- ---------------------------------------------------------------------
-- 3. Row Level Security: ON for every table, no policies yet (deny all)
-- ---------------------------------------------------------------------

alter table public.roles                    enable row level security;
alter table public.careers                  enable row level security;
alter table public.profiles                 enable row level security;
alter table public.student_profiles         enable row level security;
alter table public.student_career_interests enable row level security;
alter table public.guardian_consents        enable row level security;
alter table public.professional_profiles    enable row level security;
alter table public.availability_slots       enable row level security;
alter table public.mentorship_requests      enable row level security;
alter table public.messages                 enable row level security;
alter table public.courses                  enable row level security;
alter table public.course_progress          enable row level security;
alter table public.peer_connections         enable row level security;
alter table public.reports                  enable row level security;
alter table public.notifications            enable row level security;
alter table public.admin_activity_log       enable row level security;

-- Privileges: nothing for the API roles by default. Each table gets exactly
-- the grants it needs in the migration that adds its policies.
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables    from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;

-- ---------------------------------------------------------------------
-- 4. Helper functions used inside policies and triggers
--    SECURITY DEFINER so they can read profiles/roles without recursing
--    into those tables' own policies; search_path is pinned to ''.
-- ---------------------------------------------------------------------

create function public.current_access_level()
returns text
language sql stable security definer set search_path = ''
as $$
  select r.access_level
  from public.profiles p
  join public.roles r on r.id = p.role_id
  where p.id = auth.uid()
$$;

-- Active = switched on, not soft-deleted. Accounts waiting for guardian
-- consent are inactive, so they are blocked almost everywhere.
create function public.is_active_user()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(
    (select p.is_active and p.deleted_at is null from public.profiles p where p.id = auth.uid()),
    false
  )
$$;

create function public.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(public.current_access_level() = 'admin', false) and public.is_active_user()
$$;

revoke all on function public.current_access_level(), public.is_active_user(), public.is_admin() from public;
grant execute on function public.current_access_level(), public.is_active_user(), public.is_admin()
  to anon, authenticated;

-- ---------------------------------------------------------------------
-- 5. Sign-up trigger: creates the profile (and student/professional rows)
--    from the sign-up metadata. The role is WHITELISTED to student or
--    professional; anything else becomes student. Admins are only ever
--    created by an admin through the admin-create-user Edge Function.
-- ---------------------------------------------------------------------

create function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  meta        jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_wanted    text  := coalesce(meta ->> 'role', 'student');
  v_role_id   uuid;
  v_name      text;
  v_dob       date;
  v_guardian  text;
  v_minor     boolean := false;
  v_career_id uuid;
  v_years     integer;
begin
  if v_wanted not in ('student', 'professional') then
    v_wanted := 'student';
  end if;

  select id into v_role_id from public.roles where name = v_wanted and is_system;
  if v_role_id is null then
    raise exception 'Built-in role % is missing', v_wanted;
  end if;

  v_name := left(coalesce(nullif(btrim(meta ->> 'name'), ''), split_part(coalesce(new.email, 'user'), '@', 1)), 100);

  if v_wanted = 'student' then
    v_dob := nullif(meta ->> 'date_of_birth', '')::date;
    if v_dob is null then
      raise exception 'date_of_birth is required for students';
    end if;
    if v_dob > current_date or v_dob < date '1900-01-01' then
      raise exception 'date_of_birth is not a valid date';
    end if;

    v_minor := v_dob > (current_date - interval '18 years')::date;
    if v_minor then
      v_guardian := lower(nullif(btrim(meta ->> 'guardian_email'), ''));
      if v_guardian is null then
        raise exception 'guardian_email is required for students under 18';
      end if;
      if v_guardian = lower(coalesce(new.email, '')) then
        raise exception 'guardian_email must differ from the student''s own email';
      end if;
    end if;

    -- Under 18: the account stays inactive until the guardian confirms.
    insert into public.profiles (id, name, role_id, is_active)
    values (new.id, v_name, v_role_id, not v_minor);

    insert into public.student_profiles (user_id, date_of_birth, guardian_email)
    values (new.id, v_dob, v_guardian);

    if jsonb_typeof(meta -> 'career_interest_ids') = 'array' then
      insert into public.student_career_interests (student_id, career_id)
      select new.id, c.id
      from public.careers c
      where c.is_active
        and c.id::text in (select jsonb_array_elements_text(meta -> 'career_interest_ids'))
      limit 10;
    end if;

    if v_minor then
      -- token_hash is a throwaway here. The send-guardian-consent Edge Function
      -- (fired by a webhook on this insert) creates the real one-time token,
      -- stores ONLY its hash, and emails the raw token to the guardian.
      insert into public.guardian_consents (student_id, guardian_email, token_hash, expires_at)
      values (
        new.id,
        v_guardian,
        encode(sha256(convert_to(gen_random_uuid()::text || clock_timestamp()::text, 'UTF8')), 'hex'),
        now() + interval '7 days'
      );
    end if;

  else -- professional
    select c.id into v_career_id
    from public.careers c
    where c.is_active and c.id::text = meta ->> 'career_id';
    if v_career_id is null then
      raise exception 'A valid career_id is required for professionals';
    end if;

    v_years := nullif(meta ->> 'experience_years', '')::integer;

    insert into public.profiles (id, name, role_id, is_active)
    values (new.id, v_name, v_role_id, true);

    insert into public.professional_profiles (user_id, career_id, bio, experience_years)
    values (new.id, v_career_id, left(nullif(btrim(meta ->> 'bio'), ''), 2000), v_years);
  end if;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 6. Role-escalation guard: only an admin (or a trusted server-side caller
--    such as the service role / SQL editor, where auth.uid() is null) may
--    change role_id, is_active or deleted_at on a profile. Without this a
--    user could promote themselves through their own update policy.
-- ---------------------------------------------------------------------

create function public.guard_profile_changes()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is not null
     and not public.is_admin()
     and (new.role_id    is distinct from old.role_id
       or new.is_active  is distinct from old.is_active
       or new.deleted_at is distinct from old.deleted_at
       or new.id         is distinct from old.id)
  then
    raise exception 'Only an administrator can change a role or account status'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function public.guard_profile_changes() from public, anon, authenticated;

create trigger guard_profile_changes
  before update on public.profiles
  for each row execute function public.guard_profile_changes();

-- ---------------------------------------------------------------------
-- 7. Seed data
-- ---------------------------------------------------------------------

insert into public.roles (name, description, access_level, is_system) values
  ('student',      'Built-in role: a young person looking for mentorship', 'student',      true),
  ('professional', 'Built-in role: a career professional offering mentorship', 'professional', true),
  ('admin',        'Built-in role: platform administrator', 'admin', true)
on conflict (name) do nothing;

insert into public.careers (name, description) values
  ('Software Engineering',        'Designing and building software and web applications.'),
  ('Medicine & Healthcare',       'Doctors, nurses, pharmacists and other health professionals.'),
  ('Law',                         'Lawyers, magistrates and legal advisers.'),
  ('Accounting & Finance',        'Accounting, auditing, banking and financial management.'),
  ('Civil & Electrical Engineering', 'Building infrastructure, power and telecommunications.'),
  ('Agriculture & Agribusiness',  'Farming, food processing and agricultural enterprise.'),
  ('Teaching & Education',        'Teachers, lecturers and education specialists.'),
  ('Journalism & Media',          'Reporting, broadcasting and content creation.'),
  ('Entrepreneurship',            'Starting and growing a business.')
on conflict (name) do nothing;
