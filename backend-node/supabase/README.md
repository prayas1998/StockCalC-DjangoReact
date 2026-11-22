# Account authentication release gate

Use the Hono API as the only deployed backend for account operations. Before switching traffic, apply the journal and account lifecycle migrations in order to a disposable Supabase project. Confirm that the account deletion endpoint passes the cascade check and that deleting one fixture user removes their rows in the journal tables while leaving the second fixture user's journal intact.

Verify both of these hosted Auth email provider settings:

- Disable **Confirm email** while username signup uses addresses under `users.tradesmart.local`. These addresses have no inbox. Confirm a new fixture user can sign up and sign in with the username.
- Enable **Require current password**. From a dedicated fixture session, a direct Supabase Auth password update without the current password must fail. Verify the Hono endpoint rejects the wrong password and accepts the correct one for an older session. Hono verifies the same account in a fresh password grant, uses it for the change, and signs it out afterward. Expect the browser to require the new password on its next sign-in.

Test password change, deletion, and session revocation with an existing MFA-enabled fixture account at the project's required assurance level. Verify the password-only reauthentication flow works with the project's MFA policies before switching traffic.

Use the existing staging process to verify global revocation from two browser sessions, including local cleanup on the device that initiated it and refresh-token rejection on the other device. Existing JWTs may remain usable until expiration.

The disposable PostgreSQL account fixture runs both SQL migrations and verifies ownership, cascade rollback, and synthetic username immutability. Run it only against an empty local fixture database.

```sh
psql -X -v ON_ERROR_STOP=1 -d "$STOCKCALC_FIXTURE_DB" -f backend-node/tests/account-lifecycle.sql
```
