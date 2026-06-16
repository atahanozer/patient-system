# Patients Management System

A full-stack patient records application built as a take-home demo. A **NestJS + Prisma + PostgreSQL** API serves role-aware, paginated patient data; a **Next.js + React + Tailwind** frontend consumes it with optimistic updates, light/dark theming, and graceful handling of a deliberately flaky backend dependency. The whole stack runs with a single `docker compose up`.

## Live demo

| | URL |
| --- | --- |
| **App** (Netlify) | https://ubiquitous-dolphin-2513fa.netlify.app |
| **API** (Render) | https://patient-system-x950.onrender.com |

Sign in with the seeded accounts:

- `admin@demo.health` / `Admin123!` — full CRUD
- `user@demo.health` / `User123!` — view-only

> Free-tier notes: the Render API may **cold-start (~30–60s)** on the first request after it's been idle. The chaos simulation (occasional latency + `503`s on `/patients`, which the UI retries / rolls back) is toggled by `CHAOS_ENABLED` on the API.

## Features

- **Role-aware JWT auth** — bcrypt password check, signed JWT, bearer-token auth on every protected route.
- **RBAC** — `admin` (full CRUD) vs `user` (view-only); enforced server-side, reflected in the UI (401 vs 403).
- **Patients CRUD** with **server-side search, sort, and pagination** (`page`, `limit`, `search`, `sortBy`, `sortOrder`).
- **Optimistic updates with rollback** — create/edit/delete update the cache instantly and revert on failure (TanStack Query).
- **Simulated flaky-dependency resilience** — a chaos interceptor injects latency + intermittent `503`s on `/patients`; the UI surfaces retry/error states instead of breaking.
- **Light/dark theme** with system preference, **accessible** states (roles, `aria-live`, focus rings, keyboard-navigable dialogs), and a **mobile card layout**.
- **One-command Docker** — Postgres + auto-migrate + seed + API + web.
- **Tests** — backend Jest unit + Supertest e2e; frontend Vitest component/unit.

## Tech stack

- **Backend:** NestJS 11, Prisma 6, PostgreSQL 16, passport-jwt + bcrypt, class-validator/class-transformer, zod (env validation), helmet, `@nestjs/throttler`.
- **Frontend:** Next.js 16 (App Router), React 19, Tailwind v4, shadcn/ui (base-nova), TanStack Query v5, axios, react-hook-form, zod.
- **Infra:** Docker + Docker Compose, multi-stage Dockerfiles, Prisma migrations + seed.

## Quickstart (Docker — one command)

Prerequisite: Docker with Compose.

```bash
cp .env.example .env   # optional — compose has sensible defaults baked in
docker compose up --build
```

This brings up Postgres, runs migrations + seeds the demo data, and starts both services. Then:

- Open the app at **http://localhost:3000**
- The API is at **http://localhost:3001**
- Log in with one of the [demo credentials](#demo-credentials) below.

> Note: the database port is intentionally **not** published (the API talks to it over the compose network), so there's no conflict with a local Postgres on `5432`.

## Local development (without Docker)

Prerequisites: **Node 20**, a running **PostgreSQL** instance, and `npm`.

### Backend

```bash
cd backend
cp ../.env.example .env          # then edit DATABASE_URL to point at your Postgres
npm install
npx prisma migrate deploy        # apply migrations
npx prisma db seed               # seed demo users + ~120 patients
npm run start:dev                # http://localhost:3001
```

### Frontend

```bash
cd frontend
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:3001" > .env.local
npm run dev                      # http://localhost:3000
```

## Demo credentials

| Email | Password | Role | Can do |
| --- | --- | --- | --- |
| `admin@demo.health` | `Admin123!` | admin | View **and** create / edit / delete patients |
| `user@demo.health` | `User123!` | user | View patients only (create/edit/delete return `403`) |

## Testing

```bash
# Backend (from backend/)
npm test            # Jest unit tests — 25 tests
npm run test:e2e    # Supertest end-to-end tests — 12 tests (runs with chaos disabled)

# Frontend (from frontend/)
npm test            # Vitest component/unit tests — 16 tests
```

## Project structure

```
patient-system/
├── docker-compose.yml        # db + backend + frontend, one command
├── .env.example              # all env vars (with dev defaults)
├── backend/                  # NestJS API
│   ├── prisma/               # schema, migrations, seed (demo users + patients)
│   └── src/
│       ├── auth/             # login, JWT signing, passport-jwt strategy
│       ├── users/            # seeded-user lookup
│       ├── patients/         # CRUD + pagination/search/sort, DTOs
│       ├── common/           # guards, interceptors (logging + chaos), filter, decorators
│       ├── config/           # zod env validation
│       └── prisma/           # PrismaService (connection lifecycle)
└── frontend/                 # Next.js App Router app
    └── src/
        ├── app/              # routes: /login, /patients, /patients/[id]
        ├── components/       # patients UI + shadcn primitives
        └── lib/              # api client, auth context, contracts (zod), query hooks
```

## Deployment

**It's live** — frontend on **Netlify**, backend + managed **Postgres** on **Render** (URLs in [Live demo](#live-demo) above). Full step-by-step (env vars, CORS wiring, free-tier caveats) is in [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md). In short:

- **Backend** (Render): the multi-stage image migrates + seeds on boot; set `DATABASE_URL`, a strong `JWT_SECRET`, `CORS_ORIGIN` (= the Netlify URL), and `CHAOS_ENABLED`.
- **Frontend** (Netlify): `netlify.toml` pins `base = frontend` + the Next.js runtime; set `NEXT_PUBLIC_API_URL` (= the Render API URL) at build time (it's inlined into the client bundle).

---

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md), [`docs/API.md`](docs/API.md), and [`docs/TRADEOFFS.md`](docs/TRADEOFFS.md).
