# Account authentication release gate

Keep account operations on the Hono API. Do not use Production or Preview for
destructive validation, change provider settings there, weaken authentication
policy to make a test pass, or set up destructive fixtures there. Run
production schema migrations only through the approved deployment process.
Production and Preview currently share configuration, and there is no isolated
hosted target. Keep the release blocked until an isolated disposable Supabase
project and empty disposable PostgreSQL database are available.

## Password and MFA checks

On the disposable project, record the approved email confirmation, **Require
current password**, secure password change, and MFA assurance settings.
Synthetic username addresses under
`users.tradesmart.local` have no inbox, so the current username-signup flow
depends on email confirmation not being required. Verify that existing policy
on the disposable project. Treat signup that cannot complete under the
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
that user's journal data and leaves the other user's records intact. With two
browser sessions for one fixture account, test global revocation, local
cleanup on the initiating device, and refresh-token rejection on the other.
Existing access JWTs may remain usable until expiry. Keep provider behavior
and two-device results as release evidence; mocked local tests do not replace
them. The mocked account cases are in
[`account.test.js`](../tests/account.test.js).

The local PostgreSQL account fixture verifies ownership, cascade rollback,
and synthetic username immutability. Run it only against an empty disposable
database from the repository root:

```sh
psql -X -v ON_ERROR_STOP=1 -d "$STOCKCALC_FIXTURE_DB" -f backend-node/tests/account-lifecycle.sql
```
