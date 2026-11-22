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
