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

Run hosted destructive checks only against an isolated disposable project and
empty disposable database. Production and Preview currently share the project
configuration, and no isolated target or active edge rule is available; do not
use the shared project for destructive fixtures or weaken MFA. Run release
migrations only through the approved deployment process. With two disposable
users, verify journal RLS
isolation and rollback, account deletion and cascade rollback, and password
change/deletion/session revocation with an MFA-enabled user at the configured
assurance level. Check the actual hosted **Require current password** and MFA
behavior, including the assurance level, and global session revocation from
two devices. The local PostgreSQL 17 fixtures
above do not replace these hosted checks. Relevant fixture paths are
[`journal-writes.sql`](backend-node/tests/journal-writes.sql),
[`journal-concurrency.sh`](backend-node/tests/journal-concurrency.sh), and
[`account-lifecycle.sql`](backend-node/tests/account-lifecycle.sql); use only
disposable targets.

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
