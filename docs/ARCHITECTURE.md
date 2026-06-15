# Architecture

## High-level overview

```
┌─────────────┐   HTTPS / JSON    ┌──────────────────────────────────────────────┐
│   Browser   │ ─────────────────▶│              NestJS API (:3001)                │
│             │   Bearer token    │                                                │
│  Next.js    │                   │  ValidationPipe                                │
│  (:3000)    │                   │     │                                          │
│             │                   │     ▼                                          │
│  React 19   │                   │  JwtAuthGuard ──▶ RolesGuard                    │
│  TanStack   │◀───── JSON ───────│     │                                          │
│  Query +    │   error envelope  │     ▼                                          │
│  axios      │                   │  ChaosInterceptor (patients only)              │
└─────────────┘                   │     │                                          │
                                  │     ▼                                          │
                                  │  LoggingInterceptor                            │
                                  │     │                                          │
                                  │     ▼                                          │
                                  │  Controller ──▶ Service ──▶ Prisma ──▶ Postgres│
                                  │                                                │
                                  │  HttpExceptionFilter (wraps all errors)        │
                                  └──────────────────────────────────────────────┘
```

The frontend is a pure client of the API: it holds a bearer token, calls the API
over axios, and renders server-driven lists. The backend owns all
authorization, validation, and data access.

---

## Backend

### Module map

| Module | Responsibility |
| --- | --- |
| `AppModule` | Composition root. Registers global `ThrottlerGuard` (100 req/60s) and global `LoggingInterceptor`; wires `ConfigModule` with zod validation. |
| `config/env.validation.ts` | Validates/coerces `process.env` at boot with zod; the app refuses to start on invalid config. |
| `AuthModule` | `POST /auth/login`, JWT signing (`JwtModule`), and the passport `JwtStrategy`. |
| `UsersModule` | `UsersService.findByEmail` — lookup over the seeded users. |
| `PatientsModule` | `PatientsController` + `PatientsService`: CRUD with search/sort/pagination. Controller-scoped `JwtAuthGuard`, `RolesGuard`, and `ChaosInterceptor`. |
| `PrismaModule` | `PrismaService` — the Prisma client with connect/disconnect lifecycle hooks. |
| `common/` | Cross-cutting pieces: `HttpExceptionFilter`, `LoggingInterceptor`, `ChaosInterceptor`, `JwtAuthGuard`, `RolesGuard`, `@Roles`, `@CurrentUser`. |

### Request lifecycle

A request to a protected patients route passes through this pipeline (registered globally in `main.ts`/`AppModule`, plus controller-scoped guards/interceptors on `PatientsController`):

1. **`ValidationPipe`** (global, `whitelist + forbidNonWhitelisted + transform`) — strips/rejects unknown fields and coerces types (e.g. query `page`/`limit` strings → numbers via `@Type`). Validation failure → **400**.
2. **`JwtAuthGuard`** — verifies the bearer token via passport-jwt. Missing/invalid/expired token → **401**.
3. **`RolesGuard`** — reads `@Roles(...)` metadata; if the route requires a role the user lacks → **403**. Routes without `@Roles` are allowed for any authenticated user.
4. **`ChaosInterceptor`** (patients controller only) — when `CHAOS_ENABLED`, adds 100–800 ms latency and fails ~`CHAOS_FAILURE_RATE` of requests with **503**.
5. **`LoggingInterceptor`** (global) — logs one line per request on completion: `METHOD url → status (Nms)`.
6. **Controller → Service → Prisma → Postgres** — the handler runs.
7. **`HttpExceptionFilter`** (global, `@Catch()` all) — wraps every error into a stable envelope (see [API.md](./API.md)); 5xx are logged with a stack and never leak internals.

> Throttling sits in front of all of this as a global guard. `/auth/login` is tightened to 5 attempts/60s via `@Throttle` to blunt brute-forcing.

### Auth / RBAC flow

```
POST /auth/login {email,password}
   └─ AuthService.validateUser → bcrypt.compare against the seeded passwordHash
   └─ on success: JwtService.signAsync({ sub, email, role }), expires in JWT_EXPIRES_IN
   └─ returns { token, user: { email, role } }   (role lowercased for the client)

Subsequent requests:
   Authorization: Bearer <token>
   └─ JwtAuthGuard → JwtStrategy.validate → req.user = { userId, email, role }
   └─ RolesGuard compares req.user.role against @Roles(...) on the handler
```

- **401 vs 403** are deliberately distinct: 401 means "not authenticated" (no/invalid token), 403 means "authenticated but not allowed" (wrong role). `GET /patients` requires only a valid token; `POST/PUT/DELETE` additionally require `admin`.
- Role comparison is case-insensitive: the DB stores `ADMIN`/`USER` (Prisma enum), the JWT carries the raw role, and the guard lowercases both sides.

### Resilience / chaos model

`ChaosInterceptor` exists to **make the frontend's resilience demonstrable** — without a real flaky dependency there's nothing for the UI's retry/rollback logic to react to.

- **Gating:** enabled by `CHAOS_ENABLED` (default `true`), failure probability `CHAOS_FAILURE_RATE` (default `0.15`). It is **scoped to `PatientsController`**, never global — so it never breaks `/auth/login`, and e2e tests run with `CHAOS_ENABLED=false` for determinism.
- **Behavior:** every patients request gets 100–800 ms of latency; ~15% throw `ServiceUnavailableException` (**503**).
- **Frontend response:** TanStack Query retries once (`retry: 1`); list/detail views show explicit error states with a **Retry** button; **mutations roll back** their optimistic cache update and toast "…failed — restored". A 503 on the detail page shows a retryable "couldn't load" state, distinct from a genuine 404.

---

## Frontend

### App Router structure

```
src/app/
├── layout.tsx              # root: fonts, ThemeProvider, QueryClient Providers, AuthProvider, Toaster
├── page.tsx                # redirects "/" → "/patients"
├── (auth)/login/page.tsx   # login form (react-hook-form + zod)
└── (app)/
    ├── layout.tsx          # client-side route guard + app chrome (header, role badge, logout)
    ├── patients/page.tsx   # list: toolbar, table, pagination, dialogs (URL-driven params)
    └── patients/[id]/page.tsx  # detail: loading/404/error states
```

### Auth context + client route guard

- `AuthProvider` (`lib/auth/auth-context.tsx`) reads the persisted session **once** via a lazy `useState` initializer (SSR-safe — storage helpers return `null` on the server). It validates a token's `exp` claim client-side and clears stale tokens.
- The `(app)` layout is the **route guard**: while hydrating it shows a skeleton; once hydrated with no token it redirects to `/login`. This is **client-side only** (see [TRADEOFFS.md](./TRADEOFFS.md)) — there is no SSR/middleware gate because the token lives in `localStorage`.
- The axios client (`lib/api/client.ts`) attaches the bearer token on every request and, on a **401**, clears the session and redirects to `/login` (guarding against loops).

### Data layer (TanStack Query)

- `lib/patients/api.ts` — thin axios wrappers; **every response is parsed through a zod schema**, so malformed payloads fail loudly at the boundary.
- `lib/patients/hooks.ts` — `usePatients` (list, `keepPreviousData` for smooth pagination), `usePatient`, and the three mutation hooks.
- List query keys include the full params object (`["patients", params]`), so each page/sort/search combination is cached independently; mutations invalidate the `["patients"]` prefix on settle.

### Optimistic update with rollback

All three mutations follow the same pattern:

```
onMutate:  cancel in-flight queries → snapshot previous cache (`prev`)
           → write the optimistic change (prepend/patch/remove the row)
           → return { prev }
onError:   restore `prev` into the cache → toast "…failed — restored"
onSuccess: toast success
onSettled: invalidate ["patients"] to reconcile with the server
```

Because the chaos interceptor fails ~15% of writes, the rollback path is exercised regularly in the demo — the list snaps back and the user is told.

### Theming / tokens

- `next-themes` with `attribute="class"`, `defaultTheme="system"`. Tailwind v4 + shadcn (base-nova) design tokens drive colors via CSS variables (`--border`, `--muted`, `--primary`, …), so light/dark is a class flip on `<html>`. A `ThemeToggle` lets the user override the system preference.

### Accessibility

- Semantic roles and live regions (`role="status"`/`aria-live="polite"` for the "Updating…" hint, `role="alert"` for error states), visible focus rings (`focus-visible:ring`), keyboard-navigable shadcn dialogs/alert-dialogs (focus trap + Escape), `aria-label`ed icon buttons, and `autoComplete` hints on form fields. A mobile card layout replaces the table on small screens.

---

## Contract duplication (FE zod ⇆ BE class-validator)

The request/response shapes are defined **twice**: as `class-validator` DTOs on the backend (`backend/src/**/dto/*`) and as zod schemas on the frontend (`frontend/src/lib/contracts/*`). They are kept in sync **by hand** and **cross-referenced with `// CONTRACT:` comments on both sides** that name the mirrored file.

Why duplicate instead of extracting a shared package:

- The contract surface is tiny (one patient shape, one login shape) and changes rarely, so drift risk is low.
- A shared package would add a workspace/build-tooling layer (and a publish/version step) that isn't worth it at this size.
- The two validators serve different runtimes anyway: zod also powers **form** validation + **runtime response parsing** in the browser; class-validator powers **DTO** validation on the server.

In a larger system this would become a shared, generated contract (see "What I'd do next" in [TRADEOFFS.md](./TRADEOFFS.md)).
