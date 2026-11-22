# Account authentication release gate

Keep account operations on the Hono API. For a shared Supabase target, run
hosted smoke checks only after the target owner authorizes the scope, using
newly created disposable app accounts and their own rows. Do not run local SQL
fixture scripts, seeds, drops, truncates, or broad cleanup there. Never weaken
RLS, MFA, or other provider security to make a test pass. Apply release
migrations only through the approved deployment process; run SQL fixtures
only against a separate empty local PostgreSQL database.

## Journal RLS rollout

The existing journal-write and account-lifecycle migrations do not add the
three journal owner policies; `202611220003_journal_owner_policies.sql` does.
Use this order: (1) stage compatible Hono traffic and route all protected
journal consumers to it, or pause incompatible consumers during a maintenance
window; (2) enable owner policies through the approved release process; (3)
compare catalog policy definitions and roles with the migration, then use
ordinary caller sessions and known fixture table/link IDs to verify Data API
read isolation; separately check Hono owner read/write and confirm the other
fixture data is unchanged. Direct DML write enforcement is tested by the
disposable PostgreSQL fixtures, so do not add direct DML to the hosted smoke.
If migration preconditions refuse to apply, investigate policy/sequence state
instead of removing policies. If smoke checks fail, keep journal traffic off
the incompatible backend until corrected. Use ordinary caller sessions and
bounded fixture IDs for Data API checks, not service-role credentials or
unbounded row queries. Keep the service-role key for admin operations only;
never weaken owner policies for rollback.

## Password and MFA checks

On the approved target, record the email confirmation, **Require
current password**, secure password change, and MFA assurance settings.
Synthetic username addresses under
`users.tradesmart.local` have no inbox, so the current username-signup flow
depends on email confirmation not being required. Verify the approved policy
using a disposable account. Treat signup that cannot complete under the
approved policy as an open release issue.

For a password change, the fresh password grant proves the supplied current
password and must resolve to the same user as the original session. The
password update uses the original caller session so Supabase can enforce that
session's assurance level. The handler sends `current_password` and the new
password with the original session. First verify that this meets the provider's
configured policy; some settings may allow that session while others may ask
for a fresh sign-in. Revoke the temporary verification grant after use. Verify
wrong-password rejection, successful change, and session cleanup using
disposable accounts.

If the provider returns `reauthentication_needed`, the API asks the user to
sign in again and complete any required verification. Use the authorized
Supabase client flow, then retry with the fresh caller session. If AAL2 is
required, a password grant alone is not an MFA step-up; complete MFA through
the client and retry with the stepped-up caller session. The API rejects
insufficient assurance. Do not bypass MFA. Do not add nonce UI speculatively;
if the configured provider requires a nonce-only flow unsupported by the
current handler, document it as a release blocker. Keep a redacted record of
the tested policy, assurance, and outcome.

Use two disposable users to verify that deleting one account removes only
that user's journal data and leaves the other user's records intact. Perform
account removal only for a newly created disposable fixture account within
the authorized smoke-test scope. With two browser sessions for one fixture
account, test global revocation, local cleanup on the initiating device, and
refresh-token rejection on the other. Existing access JWTs may remain usable
until expiry. Keep provider behavior and two-device results as release
evidence; mocked local tests do not replace them. The mocked account cases
are in
[`account.test.js`](../tests/account.test.js).

The local PostgreSQL account fixture verifies ownership, cascade rollback,
and synthetic username immutability. Run it only against an empty disposable
database from the repository root:

```sh
psql -X -v ON_ERROR_STOP=1 -d "$STOCKCALC_FIXTURE_DB" -f backend-node/tests/account-lifecycle.sql
```
