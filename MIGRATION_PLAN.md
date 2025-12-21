# Backend Migration Plan (Django -> Node.js/TypeScript)

Goal: Replace the Django backend with a Vercel-deployable Node.js/TypeScript backend using Hono + Supabase, while preserving all existing API behavior, auth flows, and frontend compatibility.

## Phase 0 - Project Discovery and Baseline
- [x] Confirm current API surface and URL patterns used by the frontend (`/api/*`).
- [x] Map all endpoints to frontend service calls in `frontend/src/services/*`.
- [x] Document request and response payloads for each endpoint (inputs, outputs, errors).
- [x] Capture exact status codes and error messages to preserve client behavior.
- [x] Inventory all Supabase usage (auth tokens, user profile data, account deletion).
- [x] Review Supabase tables and RLS policies that back journal and tag features.
- [x] Identify any Django-only logic that must be preserved (rate limiting, error responses, logging).
- [x] Confirm database schema matches Django models (tables, columns, types, defaults, constraints).
- [x] Catalog calculation modules and shared usage points (main calculator, journal PnL, analytics).

## Phase 1 - Target Architecture and Repo Layout
- [x] Decide backend location (e.g. `backend-node/` or `api/` at repo root).
- [x] Define folder structure (routes, handlers, services, validators, utils).
- [x] Define environment variables and configuration contract (Supabase URL, anon key, service role key, JWT secret).
- [x] Define shared error response shape and status code conventions.
- [x] Define rate limiting and request logging strategy for Vercel functions.
- [x] Define API versioning approach (keep `/api/` prefix for compatibility).
- [ ] Define a centralized calculation module with zero logic changes, shared across all endpoints.

## Phase 2 - Bootstrap the Node.js/TypeScript Backend
- [x] Initialize Hono server with TypeScript and Vercel function adapter.
- [x] Add middleware for CORS, JSON parsing, and request logging.
- [x] Add global error handler with safe, user-friendly messages.
- [x] Add validation layer with Zod for all request bodies and query params.
- [x] Implement auth middleware to verify Supabase JWTs and attach user context.
- [x] Implement a compatibility layer to mirror Django response shapes and defaults.

## Phase 3 - Core Endpoints (Parity First)
- [ ] Health check: `GET /api/health-check/`.
- [ ] Charges calculator: `POST /api/calculate/` using existing calculation rules.
- [ ] Profile endpoints:
  - [ ] `GET /api/profile/` (pull user data via Supabase Admin as needed).
  - [ ] `PATCH /api/profile/` (return updated response; actual change via Supabase client).
  - [ ] `POST /api/profile/change-password/` (tell frontend to use Supabase client).
  - [ ] `DELETE /api/profile/delete-account/` (delete Supabase user + data cleanup).
- [ ] Auth utility endpoints:
  - [ ] `POST /api/auth/logout/`.
  - [ ] `POST /api/auth/revoke-all/`.
  - [ ] `GET /api/auth/introspect/`.
  - [ ] `GET /api/auth/security-status/`.

## Phase 4 - Journal and Tags API (CRUD + Search + Analytics)
- [ ] Journal CRUD:
  - [ ] `GET /api/journal/` with filters, pagination, and user scoping.
  - [ ] `POST /api/journal/` with validation and user assignment.
  - [ ] `PATCH /api/journal/:id/` with validation and ownership check.
  - [ ] `DELETE /api/journal/:id/` with ownership check.
- [ ] Tags CRUD:
  - [ ] `GET /api/tags/` scoped to user.
  - [ ] `POST /api/tags/` with uniqueness and user scoping.
  - [ ] `PATCH /api/tags/:id/` and `DELETE /api/tags/:id/` with ownership check.
  - [ ] `GET /api/tags/popular/` with usage count.
- [ ] Search and suggestions:
  - [ ] `GET /api/journal/search/` with relevance scoring.
  - [ ] `GET /api/journal/suggestions/` for quick matches.
- [ ] Analytics:
  - [ ] `GET /api/journal/analytics/` (portfolio metrics, distributions).
  - [ ] `GET /api/journal/tag-analytics/` (per-tag metrics).

## Phase 4a - Calculation Logic Preservation (No Changes Allowed)
- [ ] Port calculation modules as-is (equity delivery, equity intraday, breakeven, utils).
- [ ] Preserve rounding, precision, and charge computations exactly as current behavior.
- [ ] Centralize calculation logic in a single shared module used by all endpoints.
- [ ] Add tests only if explicitly requested; otherwise validate parity by manual comparison.

## Phase 5 - Supabase Data Access Layer
- [ ] Create a data access module for trades and tags (all queries centralized).
- [ ] Implement pagination, filtering, and sorting using Supabase query APIs.
- [ ] Ensure RLS policies enforce user scoping for all user data.
- [ ] Use service role key only for privileged operations (account deletion).
- [ ] Add defensive checks for invalid UUIDs and missing user context.
- [ ] Mirror Django schema fields and types in Supabase (no schema drift).

## Phase 6 - Frontend Compatibility Verification
- [ ] Confirm API endpoints and response shapes match existing frontend expectations.
- [ ] Confirm pagination, filtering, and sorting behavior matches Django outputs.
- [ ] Confirm auth token refresh flow works with new backend.
- [ ] Update `VITE_API_URL` values if backend base URL changes.
- [ ] Ensure error responses are consistent with current frontend handlers.

## Phase 7 - Deployment and Configuration
- [ ] Add Vercel config for API routes and runtime settings.
- [ ] Set required environment variables in Vercel.
- [ ] Verify CORS and security headers for production.
- [ ] Confirm logging and monitoring expectations for production use.

## Phase 8 - Cutover and Cleanup
- [ ] Run a staging release with both backends available.
- [ ] Switch frontend API base URL to the new backend.
- [ ] Monitor for errors and regressions.
- [ ] Remove Django backend references after stable rollout.

## Notes and Constraints
- Supabase is the source of truth; no local database migrations are needed.
- Keep `/api/` paths stable to avoid frontend rewrites.
- Preserve existing error handling behavior and status codes.
- Do not expose service role keys to the client.
- Database schema must remain the same as Django models (tables, fields, types).
- Calculation logic must be preserved exactly, including rounding behavior.
- Centralize calculation logic to avoid duplication across endpoints.
- This is a migration only; do not change UI, business logic, or user-facing behavior.
- The goal is zero user-visible changes and full endpoint parity.
