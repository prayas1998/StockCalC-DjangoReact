#!/usr/bin/env bash
# Run in the same disposable database as journal-writes.sql, using PG* connection variables.
set -euo pipefail

journal_fixture=$(mktemp -d)
export JOURNAL_FIRST_READY="$journal_fixture/ready"
export JOURNAL_FIRST_RELEASE="$journal_fixture/release"
first_pid=
second_pid=

cleanup() {
  touch "$JOURNAL_FIRST_RELEASE"
  if [[ -n "$first_pid" ]]; then wait "$first_pid" || true; fi
  if [[ -n "$second_pid" ]]; then wait "$second_pid" || true; fi
  rm -f "$JOURNAL_FIRST_READY" "$JOURNAL_FIRST_RELEASE"
  rmdir "$journal_fixture"
}
trap cleanup EXIT

PGAPPNAME=journal-concurrency-first psql -X -v ON_ERROR_STOP=1 <<'SQL' &
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000001';
begin;
select public.journal_save_trade(2, '{"buy_price":119}', array[1]::bigint[]);
\! touch "$JOURNAL_FIRST_READY"; for i in $(seq 1 400); do [ -f "$JOURNAL_FIRST_RELEASE" ] && break; sleep 0.05; done
commit;
SQL
first_pid=$!

for ((i=0; i<200; i++)); do
  if [[ -f "$JOURNAL_FIRST_READY" ]]; then break; fi
  sleep 0.05
done
[[ -f "$JOURNAL_FIRST_READY" ]]

PGAPPNAME=journal-concurrency-second psql -X -v ON_ERROR_STOP=1 <<'SQL' &
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000001';
do $$
declare
  result jsonb;
begin
  begin
    perform public.journal_save_trade(2, '{"target_price":118}', array[2]::bigint[]);
    raise exception 'A concurrent patch accepted a target below the committed entry';
  exception when sqlstate 'PT400' then null;
  end;
  result := public.journal_save_trade(2, '{"personal_notes":"Updated concurrently"}', array[2]::bigint[]);
  if (result->>'buy_price')::numeric <> 119
      or (result->>'target_price')::numeric <> 120
      or result->'tags' <> '[2]'::jsonb then
    raise exception 'Concurrent replacement lost trade fields or retained old tags';
  end if;
end;
$$;
SQL
second_pid=$!

waiting=
for ((i=0; i<100; i++)); do
  waiting=$(psql -X -At -v ON_ERROR_STOP=1 -c "select exists (
    select 1 from pg_stat_activity
    where application_name = 'journal-concurrency-second' and wait_event_type = 'Lock'
  )")
  if [[ "$waiting" == t ]]; then break; fi
  sleep 0.05
done
[[ "$waiting" == t ]]
touch "$JOURNAL_FIRST_RELEASE"
wait "$first_pid"
first_pid=
wait "$second_pid"
second_pid=
