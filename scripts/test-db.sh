#!/usr/bin/env bash
# Rebuilds a throwaway local Postgres database, applies every migration in order,
# then runs every SQL test. Needs a local Postgres (psql on PATH, superuser access).
#   Usage: scripts/test-db.sh            (DB name defaults to nexa_test)
# Never point this at a real Supabase project: it loads a mock of the auth schema.
set -euo pipefail
cd "$(dirname "$0")/.."
DB="${1:-nexa_test}"
PSQL="psql -X -q -v ON_ERROR_STOP=1"
if [ "$(id -u)" = "0" ]; then RUN="su postgres -c"; else RUN="bash -c"; fi

$RUN "psql -X -q -c 'drop database if exists $DB' -c 'create database $DB'"
$RUN "$PSQL -d $DB -f $PWD/supabase/tests/mock_supabase.sql"
for f in supabase/migrations/*.sql; do
  echo "applying $f"
  $RUN "$PSQL -d $DB -f $PWD/$f"
done
for f in supabase/tests/[0-9]*.test.sql; do
  echo "running $f"
  $RUN "$PSQL -d $DB -f $PWD/$f"
done
