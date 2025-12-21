# AGENTS Instructions

  ## Project summary
  - App: TradeSmart stock brokerage calculator and journal.
  - Frontend: React 18 + TypeScript + Vite.
  - Backend: Migration from Django to Node.js + TypeScript (Hono) for Vercel.
  - Data: Supabase is the source of truth (Postgres + Auth).
  - Goal: Migrate backend tech stack only. No UI or behavior changes.

  ## Non-negotiable requirements
  - Preserve exact behavior, status codes, and response shapes.
  - Keep calculation logic identical. Do not change rounding or formulas.
  - Centralize calculation logic in one module to avoid duplication.
  - Keep database schema identical to Django models (tables, fields, types).
  - Supabase remains the source of truth.

  ## Architecture and scalability
  - Always validate input with schemas (Zod) on every endpoint.
  - Use Supabase JWT verification for auth and attach user context.
  - Enforce user scoping with Supabase RLS and server-side checks.
  - Never expose service role keys to the client.
  - Only use service role key for admin operations (account deletion).
  - Sanitize and validate any user input to prevent injection and XSS.

  ## Error handling and logging
  - Provide meaningful, safe error messages without leaking internal details.
  - Use consistent error response formats across endpoints.
  - Log server errors with enough context for debugging.

  ## Code quality rules
  - Follow DRY and separation of concerns strictly.
  - Prefer readability and maintainability over cleverness.
  - Use descriptive names and keep functions short and focused.
  - Avoid deep nesting and complex conditionals.
  - Clean up resources and avoid memory leaks.

  ## Performance and reliability
  - Optimize queries and avoid N+1 patterns.
  - Use pagination for large datasets.
  - Keep responses small and avoid over-fetching.
  - Use rate limiting for sensitive endpoints if needed.

  ## Testing and commands
  - Do not run tests unless explicitly requested.
  - Do not run database migrations unless explicitly requested.
  - If migrations are required, describe the commands in chat only.

  ## Migration scope
  - This is a backend migration only.
  - Do not modify UI or frontend behavior unless explicitly requested.
  - Ensure endpoint parity and response compatibility with the existing frontend.