# Frontend — Patients Web App

Next.js 16 (App Router) + React 19 + Tailwind v4 + shadcn/ui client for the
Patients Management System. Features login, a patients list with debounced search,
sort, and pagination, a detail view, create/edit/delete with optimistic updates +
rollback (TanStack Query), and light/dark theming. See the
[root README](../README.md) and [`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md)
for the full picture.

## Setup & run

```bash
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:3001" > .env.local
npm run dev                # http://localhost:3000
```

## Build & test

```bash
npm run build              # production build (output: standalone)
npm test                   # Vitest component/unit tests (16)
```

## Notes

- `NEXT_PUBLIC_API_URL` is inlined into the client bundle at **build** time — it must be the browser-reachable API URL.
- The auth token lives in `localStorage`; route protection is client-side only (see [`docs/TRADEOFFS.md`](../docs/TRADEOFFS.md)).
