# Rate limiting

The API middleware applies the configured auth, data-operation, and general limits with a rolling window. Counters are separated by category and by authenticated user ID or anonymous client IP. Accepted requests are counted; a per-key 429 reports the next request expiry, while a capacity 429 reports when the earliest bucket will fully expire. Per-process state is capped at 10,000 keys. When the cap is full, expired entries are reclaimed from an earliest-expiry queue; if all entries are still live, a new key receives 429 until the next key expires.

This is a local safety ceiling only. Vercel can serve requests from different function instances and cold starts, each with independent memory, so these counters do not enforce a shared deployment-wide limit. A Node server uses the connection socket peer when available and does not trust caller-supplied forwarding headers. In the Vercel runtime, anonymous identity uses the first `x-forwarded-for` value (falling back to `x-real-ip`); those headers are safe only when the trusted edge overwrites or sanitizes caller-supplied values. A direct or differently proxied deployment must not treat arbitrary forwarded headers as client identity.

## Production deployment gate

Before release, configure a shared Vercel edge/WAF rate rule or another trusted shared atomic limiter for the API. Cover the auth, data-operation, and general API paths. The edge rule must use a platform-derived client IP. If deployment-wide per-user limits are a release requirement, use a shared limiter that can key authenticated requests by verified user ID; an IP-only edge rule cannot provide that guarantee. Do not describe the in-process counters as global protection.

Validate the deployed staging project with a synthetic client and no real user data:

1. Send requests just below and above the configured auth, data-operation, and general limits inside one window. Confirm the expected 200/429 boundary and the `retry_after` response value.
2. Repeat the burst while requests land on separate function instances and after a cold start. The shared edge/limiter must continue enforcing its configured budget.
3. From one client, vary caller-supplied `x-forwarded-for` and `x-real-ip` values during the same burst. Confirm the platform ignores or overwrites them and the effective client identity remains stable. If it does not, fix the trusted proxy configuration or use a platform-derived identity before release.
4. Verify authenticated requests are keyed by the verified user ID in the shared limiter when per-user deployment-wide budgets are required.

The repository does not configure or provision the shared edge/limiter service. Record the staging result and active rule/configuration in the release evidence; keep deployment on hold if these checks cannot be completed.
