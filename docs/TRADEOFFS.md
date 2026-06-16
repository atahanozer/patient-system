# What I cut & why (this is a demo)

This is a take-home demo, scoped to demonstrate full-stack judgment without
over-building. Below is an honest account of what was intentionally left out and
which corners were cut, each with a one-line rationale. Every shortcut listed
under "shortcuts" is also annotated inline in the code with a `// DEMO:`,
`// TRADE-OFF:`, or `// CONTRACT:` comment.

## Cut features (not built)

> **Note:** "Live cloud deploy" was originally on this list, but the app is now
> **deployed** — frontend on Netlify, backend + Postgres on Render. See the root
> README's [Live demo](../README.md#live-demo) and [`DEPLOYMENT.md`](./DEPLOYMENT.md).

| Feature | Why it was cut |
| --- | --- |
| **Playwright / full browser E2E** | The backend Supertest e2e suite covers the high-signal auth/RBAC/CRUD paths against a real DB, and frontend Vitest tests cover the component behavior — enough signal without a browser-driver layer. |
| **Refresh-token rotation** | A short-lived access token is enough to demo auth; rotation/blocklisting is real auth infra, out of scope for a demo. |
| **Password reset / email flows** | No mail provider in scope; users are seeded. |
| **User management / signup UI** | Two seeded roles are enough to demo RBAC; a registration/admin-user UI adds surface without showing anything new. |
| **Audit logging** | I log one line per request (`LoggingInterceptor`), but per-record audit trails are a compliance feature beyond a demo's scope. |
| **Soft deletes** | Delete is a hard delete; soft-delete + restore is product surface not needed to show CRUD. |
| **Multi-tenancy** | Single-tenant keeps the data model and authz simple; tenancy is a large cross-cutting concern. |
| **Internationalization (i18n)** | English-only UI; i18n plumbing adds weight without demonstrating new skill here. |
| **Redis caching** | The dataset is ~120 rows and queries are indexed/paginated; a cache layer would be premature optimization. |

## Deliberate demo shortcuts (and why)

| Shortcut | Where | Why it's fine here / what prod would do |
| --- | --- | --- |
| **Seeded users, no signup** | `backend/prisma/seed.ts` | Two fixed accounts make RBAC reviewable instantly; prod would have registration + an identity provider. |
| **Committed dev JWT secret** | `.env.example`, `docker-compose.yml`, read in `auth.module.ts` / `jwt.strategy.ts` | A placeholder secret keeps setup to one command. Prod rotates to a strong, secret-managed value — leaking it lets anyone forge tokens. |
| **Token in `localStorage`** | `frontend/src/lib/auth/storage.ts`, `(app)/layout.tsx` | Gives client-only route protection and an XSS read surface — acceptable for a mock-token demo. Prod would use `httpOnly`, `Secure`, `SameSite` cookies so JS can't read the token, plus server/middleware-side route gating. |
| **Simulated chaos (latency + 503)** | `backend/src/common/interceptors/chaos.interceptor.ts` | There's no real flaky dependency to make the UI's retry/rollback visible, so we inject one (patients routes only, env-gated, off in e2e). |
| **Duplicated contract types FE/BE** | `frontend/src/lib/contracts/*` ⇆ `backend/src/**/dto/*` | Small surface, low drift, cross-referenced with `// CONTRACT:` comments on both sides — cheaper than a shared package at this size. |
| **Fuller backend Docker image** | `backend/Dockerfile` | The runtime stage ships dev deps (ts-node, prisma CLI, faker) so the entrypoint can run the `ts-node` seed. Optimized for "one `docker compose up`", not minimal image size; prod would compile the seed and prune. |
| **`firstName` / `createdAt` sort columns unindexed** | `backend/prisma/schema.prisma` | Only `lastName` and `dob` are indexed (the common sort columns). The other sortable columns are unindexed — fine at ~120 rows; add `@@index` if the dataset grows. |

## What I'd do next with more time

1. **`httpOnly` cookies + refresh tokens** — move the access token out of `localStorage` into a secure cookie, add short-lived access + rotating refresh tokens, and gate routes server-side.
2. **Shared, generated contract package** — derive the FE zod schemas and BE DTOs from one source of truth to eliminate hand-sync drift.
3. **Playwright E2E** — a browser-level happy-path suite (login → search → create → edit → delete → logout) on top of the existing unit/e2e tests.
4. **Server-side rendering of the list** — render the first page of patients on the server (with cookie auth) for a faster first paint and better SEO/perceived performance.

> Already done since the original cut list: **live cloud deploy** (Netlify + Render), a **CI-ready** pre-commit hook (husky + lint-staged), and **phone search + DOB/phone validation**.
