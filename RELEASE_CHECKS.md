# Release checks

Install each application from its lockfile and run the same checks used by
CI before merging a change or promoting a release. CI uses Node 24.

Backend:

```sh
cd backend-node
npm ci
npm run typecheck
npm run lint
npm test
```

The backend tests expect native test files in `backend-node/tests/*.test.js`.
The SQL integration fixtures need PostgreSQL 17, `pg_config`, and `psql`,
with a superuser connection to a disposable cluster. Create a separate empty
database for each fixture, then run:

```sh
createdb journal_fixture
psql -X -v ON_ERROR_STOP=1 -d journal_fixture -f tests/journal-writes.sql
export PGDATABASE=journal_fixture
bash tests/journal-concurrency.sh
unset PGDATABASE
createdb account_fixture
psql -X -v ON_ERROR_STOP=1 -d account_fixture -f tests/account-lifecycle.sql
```

Run these commands from `backend-node/`. They create database roles and
schemas and must not target a shared or production database.

Frontend:

```sh
cd frontend
npm ci
npm run check-all
npm test
npm run build
```

The frontend type check covers both `src/` and the Vite configuration. Both
test commands require `.test.js` files and at least one passing test; failed
tests keep the command unsuccessful, and skipped-only suites fail the gate.
GitHub Actions runs the checks and SQL fixtures for pull requests to any
branch, including stacked pull requests, and pushes to branches.

## Promotion and rollback gates

Before merging the release candidate, require CI to confirm that
`backend-node/.env.backup` is absent from both the PR head tree and the
prospective merge tree using Git tree metadata. The
[`credential-backup` job in `ci.yml`](.github/workflows/ci.yml) checks both
trees separately from its sparse-checkout absence check. Never print or
download the file.
Keep promotion blocked until each exposed credential has been retired and
previously uploaded copies have been checked and removed where possible.

The existing journal-write and account-lifecycle migrations do not add the
three owner policies. Apply `202611220003_journal_owner_policies.sql` through
the approved release process in coordination with the Hono rollout:

1. Stage the compatible Hono candidate. Its protected journal queries use the
   anon/publishable API key with the caller's bearer token; confirm the caller
   JWT is evaluated as PostgreSQL role `authenticated`.
2. Route all protected journal consumers to that candidate before enabling
   policies, or pause incompatible consumers during a maintenance window.
3. After enabling policies, compare catalog policy definitions and roles with
   the migration. With ordinary sessions for two disposable accounts, query
   only their known fixture table/link IDs and verify the Data API returns the
   caller's subset and no other user's IDs. Separately verify Hono owner
   read/write and that the other fixture data remains unchanged. Direct DML
   write enforcement is covered by the disposable PostgreSQL fixtures; do
   not add direct DML to the hosted smoke. Remove only fixture accounts/rows
   created for this authorized test.

If the check fails, keep journal traffic off the incompatible backend until
the issue is corrected. If migration preconditions refuse to apply, investigate
the target's policy and sequence state; do not remove existing policies or
weaken RLS as a workaround. For Data API checks, use ordinary caller sessions
and bounded fixture IDs; do not use service-role credentials or unbounded row
queries. Keep the service-role key limited to admin actions.

Do not run local SQL fixtures, seeds, drops, truncates, or broad cleanup on a
shared Supabase target. The smoke test does not replace the mandatory local
PostgreSQL 17 fixtures above, which cover transaction rollback. Relevant
fixture paths are
[`journal-writes.sql`](backend-node/tests/journal-writes.sql),
[`journal-concurrency.sh`](backend-node/tests/journal-concurrency.sh), and
[`account-lifecycle.sql`](backend-node/tests/account-lifecycle.sql); use only
an empty local disposable database for the SQL fixtures. Check API edge
routing, shared edge rate-limiter enforcement, trusted-proxy configuration,
and Auth-provider behavior as separate release gates; RLS smoke checks do not
cover them. For account, MFA, and two-device provider checks, see
[`backend-node/supabase/README.md`](backend-node/supabase/README.md).

Keep account operations on Hono. The Django password-change endpoint returns
501 and leaves the password unchanged. In a modern-only deployment where
Django's Auth admin client is not configured, its account-deletion guard
returns 503 before cleanup. When Django is configured with a legacy
service-role admin credential, its current deletion path does not
reauthenticate the current password and deletes
application rows before deleting the Auth user, so provider failure can leave
partial deletion. Django's legacy revoke-all endpoint returns HTTP 200 without
revoking sessions. Do not route password changes, deletion, or session
revocation to Django during rollback. Hono release checks are in
[`backend-node/supabase/README.md`](backend-node/supabase/README.md).
