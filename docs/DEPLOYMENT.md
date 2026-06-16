# Deployment guide — Frontend on Netlify, Backend + Postgres on Render

This app is two deployables: a **NestJS API + PostgreSQL** and a **Next.js frontend**.
Netlify is a great host for the Next.js frontend, but it isn't suited to a long‑running
Nest server + a database — so the backend goes to **Render** (which also gives you a
managed Postgres). Total time: ~30–45 minutes.

> The Docker images already build and run the whole stack locally (`docker compose up`),
> which proves deployability. The steps below wire the two pieces up on real hosts.

## Architecture once deployed

```
Browser ──HTTPS──▶ Netlify (Next.js frontend)
   │                     │  NEXT_PUBLIC_API_URL (baked at build time)
   └──────HTTPS─────────▶ Render (NestJS API) ──▶ Render Managed Postgres
                          CORS_ORIGIN = the Netlify URL
```

The two cross‑references (frontend → API URL, API → CORS origin) are the only fiddly
part. Deploy the backend first to get its URL, then the frontend, then point CORS back.

---

## 0. Prerequisites
- The repo pushed to GitHub (see the root README / `git push`).
- A [Render](https://render.com) account and a [Netlify](https://netlify.com) account (both have free tiers).
- No secrets are committed — you'll set them as environment variables on each host.

---

## 1. Backend + database on Render

### 1a. Create the Postgres database
1. Render dashboard → **New → Postgres**.
2. Name it (e.g. `patients-db`), pick a region + the free plan, **Create**.
3. When it's ready, copy the **Internal Database URL** (used by services in the same Render region).

### 1b. Create the API web service
1. Render → **New → Web Service** → connect your GitHub repo.
2. Settings:
   - **Root Directory:** `backend`
   - **Runtime:** **Docker** (Render will use `backend/Dockerfile`, which runs
     `prisma migrate deploy` + `prisma db seed` + starts the server on boot).
   - **Health Check Path:** `/health`
3. **Environment variables** (Advanced → Add):
   | Key | Value |
   |---|---|
   | `DATABASE_URL` | the Internal Database URL from step 1a |
   | `JWT_SECRET` | a strong random string (e.g. `openssl rand -base64 32`) |
   | `JWT_EXPIRES_IN` | `1h` |
   | `CHAOS_ENABLED` | `false` *(turn the flaky‑dependency simulation off in prod)* |
   | `CHAOS_FAILURE_RATE` | `0.15` |
   | `CORS_ORIGIN` | a placeholder for now, e.g. `https://example.netlify.app` (you'll update it in step 3) |
   > Don't set `PORT` — Render injects its own `PORT` and the app reads it from the validated env.
4. **Create Web Service.** Watch the logs: you should see migrations apply, the seed run
   ("🌱 The seed command has been executed"), then "Nest application successfully started".
5. Copy the service URL, e.g. `https://patients-api.onrender.com`. Verify:
   `curl https://patients-api.onrender.com/health` → `{"status":"ok",...}`.

> **Free‑tier note:** Render free web services sleep after inactivity and cold‑start in
> ~30–60s on the first request. Fine for a demo; mention it if a reviewer sees a slow first load.

---

## 2. Frontend on Netlify

1. Netlify → **Add new site → Import an existing project** → pick the GitHub repo.
2. Settings:
   - **Base directory:** `frontend`
   - **Build command:** `npm run build`
   - Netlify auto‑detects Next.js and uses its Next runtime (it handles SSR/routing; you
     don't set a publish directory manually).
3. **Environment variables** → add:
   | Key | Value |
   |---|---|
   | `NEXT_PUBLIC_API_URL` | the Render API URL from step 1b, e.g. `https://patients-api.onrender.com` |
   > This is **inlined at build time** into the client bundle, so it must be set *before* the build.
4. **Deploy.** Copy the resulting site URL, e.g. `https://patients-app.netlify.app`.

> **`output: 'standalone'` note:** the Next config sets `output: 'standalone'` for the Docker
> image. If the Netlify build complains about it, remove that line for the Netlify deploy (Netlify's
> runtime provides its own server) — or gate it behind an env check. It does not affect local Docker.

---

## 3. Connect CORS (the last step)
1. Back on Render → the API service → **Environment** → set `CORS_ORIGIN` to the exact Netlify
   URL from step 2.4 (e.g. `https://patients-app.netlify.app`, no trailing slash).
2. Save → Render redeploys the API.
3. Open the Netlify URL, log in with the demo credentials:
   - `admin@demo.health` / `Admin123!` (full CRUD)
   - `user@demo.health` / `User123!` (view‑only)

That's it. The patients list, search/sort/pagination, create/edit/delete, and RBAC all work
against the live API.

---

## Troubleshooting
- **CORS errors in the browser console:** `CORS_ORIGIN` on Render must match the Netlify origin
  exactly (scheme + host, no trailing slash). Redeploy the API after changing it.
- **Login works but data calls fail:** check `NEXT_PUBLIC_API_URL` was set *before* the Netlify
  build (it's build‑time). Trigger a fresh deploy after changing it.
- **First request very slow:** Render free tier cold start — see the note above.
- **Seed didn't run / no patients:** check the Render deploy logs for the migrate+seed step; the
  seed is idempotent (won't duplicate on redeploys).

## Alternative: everything on Render
You can skip Netlify and deploy the frontend as a second Render service (Docker, root
`frontend`, build arg `NEXT_PUBLIC_API_URL`). One dashboard, but you lose Netlify's CDN/preview
deploys. The split above is the recommended setup.
