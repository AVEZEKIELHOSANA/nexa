#!/usr/bin/env bash
# Double-booking test: two database sessions accept two competing requests for the SAME slot
# at the same moment. Exactly one must succeed; the other must be refused.
# Run it after scripts/test-db.sh has built the throwaway database (default name nexa_test).
#   Usage: scripts/test-concurrency.sh [db-name]
# Never point this at a real Supabase project.
set -euo pipefail
DB="${1:-nexa_test}"
if [ "$(id -u)" = "0" ]; then RUN="su postgres -c"; else RUN="bash -c"; fi
PSQL="psql -X -q -t -A -d $DB"
TMP="$(mktemp -d)"; chmod 755 "$TMP"
trap 'rm -rf "$TMP"' EXIT

PRO=70000000-0000-0000-0000-0000000000b1
S1=70000000-0000-0000-0000-0000000000a1
S2=70000000-0000-0000-0000-0000000000a2
SLOT=70000000-0000-0000-0000-00000000e001

cat > "$TMP/setup.sql" <<SQL
insert into auth.users (id, email, raw_user_meta_data) values
  ('$S1', 'conc-s1@example.com', '{"name":"Conc One","date_of_birth":"2000-01-01"}'),
  ('$S2', 'conc-s2@example.com', '{"name":"Conc Two","date_of_birth":"2000-01-01"}');
insert into auth.users (id, email, raw_user_meta_data)
  select '$PRO', 'conc-p@example.com',
         jsonb_build_object('role','professional','name','Conc Pro','career_id', c.id::text) from public.careers c limit 1;
update public.professional_profiles set verification_status = 'verified', verified_at = now() where user_id = '$PRO';
insert into public.availability_slots (id, professional_id, start_time, end_time)
  values ('$SLOT', '$PRO', now() + interval '2 days', now() + interval '2 days 1 hour');
-- both students ask for the slot (as the service role, to keep the script short)
insert into public.mentorship_requests (id, student_id, professional_id, availability_slot_id, message) values
  ('70000000-0000-0000-0000-0000000000c1', '$S1', '$PRO', '$SLOT', 'first'),
  ('70000000-0000-0000-0000-0000000000c2', '$S2', '$PRO', '$SLOT', 'second');
SQL

cat > "$TMP/a.sql" <<SQL
begin;
select set_config('request.jwt.claim.sub', '$PRO', true);
set local role authenticated;
select public.accept_request('70000000-0000-0000-0000-0000000000c1');
select pg_sleep(2);          -- hold the lock so B has to wait for it
commit;
SQL

cat > "$TMP/b.sql" <<SQL
begin;
select set_config('request.jwt.claim.sub', '$PRO', true);
set local role authenticated;
select public.accept_request('70000000-0000-0000-0000-0000000000c2');
commit;
SQL

cat > "$TMP/cleanup.sql" <<SQL
select set_config('nexa.slot_system_write', 'on', false);   -- the slot is booked; let the cleanup delete it
delete from public.mentorship_requests where availability_slot_id = '$SLOT';
delete from public.availability_slots where id = '$SLOT';
delete from auth.users where id in ('$S1', '$S2', '$PRO');
SQL

chmod 644 "$TMP"/*.sql
$RUN "$PSQL -v ON_ERROR_STOP=1 -f $TMP/cleanup.sql" >/dev/null 2>&1 || true
$RUN "$PSQL -v ON_ERROR_STOP=1 -f $TMP/setup.sql"

$RUN "$PSQL -v ON_ERROR_STOP=1 -f $TMP/a.sql" >"$TMP/a.out" 2>&1 &
PID_A=$!
sleep 0.7
set +e
$RUN "$PSQL -v ON_ERROR_STOP=1 -f $TMP/b.sql" >"$TMP/b.out" 2>&1
RC_B=$?
wait $PID_A; RC_A=$?
set -e

BOOKED=$($RUN "$PSQL -c \"select count(*) from public.mentorship_requests where availability_slot_id = '$SLOT' and status = 'accepted'\"")
$RUN "$PSQL -v ON_ERROR_STOP=1 -f $TMP/cleanup.sql" >/dev/null

echo "session A exit code: $RC_A   session B exit code: $RC_B   accepted requests on the slot: $BOOKED"
if [ "$RC_A" = "0" ] && [ "$RC_B" != "0" ] && [ "$BOOKED" = "1" ]; then
  echo "B was refused with: $(grep -m1 ERROR "$TMP/b.out" || true)"
  echo "CONCURRENCY TEST PASSED: exactly one accept won"
else
  echo "CONCURRENCY TEST FAILED"; cat "$TMP/a.out" "$TMP/b.out"; exit 1
fi
