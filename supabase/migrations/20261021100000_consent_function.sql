-- =====================================================================
-- Nexa  |  Migration 003  |  Guardian Consent Function
-- Day 3. Creates the RPC that activates a minor's account.
-- =====================================================================

create or replace function public.confirm_guardian_consent(token_input text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  consent_record record;
begin
  -- Find an unused, unexpired token by comparing the hash
  select * into consent_record
  from public.guardian_consents
  where token_hash = encode(sha256(convert_to(token_input, 'UTF8')), 'hex')
    and used_at is null
    and expires_at > now();

  if not found then
    raise exception 'Invalid or expired consent link.';
  end if;

  -- 1. Mark token as used so it can't be clicked twice
  update public.guardian_consents 
  set used_at = now() 
  where id = consent_record.id;

  -- 2. Record the time of consent
  update public.student_profiles 
  set guardian_consent_at = now() 
  where user_id = consent_record.student_id;

  -- 3. Activate the student's profile
  update public.profiles 
  set is_active = true 
  where id = consent_record.student_id;
end;
$$;