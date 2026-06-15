# Backend — Patients API

NestJS 11 + Prisma 6 + PostgreSQL API for the Patients Management System. Provides
JWT login, role-based access control, and patients CRUD with server-side search,
sort, and pagination. See the [root README](../README.md) for the full project,
and [`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md) / [`docs/API.md`](../docs/API.md)
for design and endpoint details.

## Setup

```bash
cp ../.env.example .env          # then set DATABASE_URL to your Postgres
npm install
npx prisma migrate deploy        # apply migrations
npx prisma db seed               # seed demo users + ~120 patients
```

## Run

```bash
npm run start:dev                      # watch mode → http://localhost:3001
npm run build && npm run start:prod    # production build (node dist/src/main)
```

## Test

```bash
npm test            # Jest unit tests (25)
npm run test:e2e    # Supertest e2e (12, runs with CHAOS_ENABLED=false)
```

## Notes

- Env vars are validated with zod at boot (`src/config/env.validation.ts`); invalid config fails fast.
- `ChaosInterceptor` simulates a flaky downstream on `/patients` — toggle with `CHAOS_ENABLED`.
