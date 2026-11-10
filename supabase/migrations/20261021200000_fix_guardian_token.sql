-- =====================================================================
-- Nexa  |  Migration 004  |  Guardian Consent Token Flow
-- Generates a secure token, saves the hash, and sends the raw token
-- to the Edge Function via pg_net.
-- =====================================================================

-- 1. Enable pg_net (allows the database to make HTTP requests)
create extension if not exists pg_net with schema extensions;

-- 2. Replace the old function
create or replace function public.handle_new_user()
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
  
  -- New variables for the token
  v_raw_token text;
  v_hashed_token text;
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
    if v_dob is null then raise exception 'date_of_birth is required'; end if;
    if v_dob > current_date or v_dob < date '1900-01-01' then raise exception 'Invalid date'; end if;

    v_minor := v_dob > (current_date - interval '18 years')::date;
    if v_minor then
      v_guardian := lower(nullif(btrim(meta ->> 'guardian_email'), ''));
      if v_guardian is null then raise exception 'guardian_email is required for minors'; end if;
      if v_guardian = lower(coalesce(new.email, '')) then raise exception 'guardian_email must differ from student'; end if;
    end if;

    insert into public.profiles (id, name, role_id, is_active)
    values (new.id, v_name, v_role_id, not v_minor);

    insert into public.student_profiles (user_id, date_of_birth, guardian_email)
    values (new.id, v_dob, v_guardian);

    if jsonb_typeof(meta -> 'career_interest_ids') = 'array' then
      insert into public.student_career_interests (student_id, career_id)
      select new.id, c.id from public.careers c
      where c.is_active and c.id::text in (select jsonb_array_elements_text(meta -> 'career_interest_ids'))
      limit 10;
    end if;

    if v_minor then
      -- Generate the token
      v_raw_token := gen_random_uuid()::text || gen_random_uuid()::text;
      v_hashed_token := encode(sha256(convert_to(v_raw_token, 'UTF8')), 'hex');

      insert into public.guardian_consents (student_id, guardian_email, token_hash, expires_at)
      values (new.id, v_guardian, v_hashed_token, now() + interval '7 days');

      -- Call the Edge Function using pg_net
      -- Note: Make sure your local server is running on port 54321, or this will fail.
      perform net.http_post(
        url := 'http://host.docker.internal:54321/functions/v1/send-guardian-consent',
        headers := jsonb_build_object('Content-Type', 'application/json'),
        body := jsonb_build_object(
          'guardian_email', v_guardian,
          'student_name', v_name,
          'token', v_raw_token
        )
      );
    end if;

  else -- professional
    select c.id into v_career_id from public.careers c
    where c.is_active and c.id::text = meta ->> 'career_id';
    if v_career_id is null then raise exception 'A valid career_id is required'; end if;

    v_years := nullif(meta ->> 'experience_years', '')::integer;

    insert into public.profiles (id, name, role_id, is_active)
    values (new.id, v_name, v_role_id, true);

    insert into public.professional_profiles (user_id, career_id, bio, experience_years)
    values (new.id, v_career_id, left(nullif(btrim(meta ->> 'bio'), ''), 2000), v_years);
  end if;

  return new;
end;
$$;