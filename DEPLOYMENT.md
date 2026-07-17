# Deployment Guide — Netlify (frontend) + Render (backend) + Neon/Supabase (database)

## 1. Database — Neon or Supabase (free tier)

1. Create a free project at [neon.tech](https://neon.tech) or [supabase.com](https://supabase.com).
2. Copy the pooled connection string (Neon: "Connection string" with `?sslmode=require"; Supabase:
   Project Settings → Database → Connection string → URI).
3. Keep it handy — it's `DATABASE_URL` for the backend.

You can migrate to Render's own managed Postgres later by swapping `DATABASE_URL` — no code
changes needed.

## 2. Backend — Render

1. Push this repo to GitHub.
2. In Render, **New → Blueprint**, point it at the repo — it will read `backend/render.yaml`.
   (Alternatively: **New → Web Service**, root directory `backend`, build command
   `npm install && npm run prisma:generate && npm run build`, start command
   `npx prisma migrate deploy && npm start`, health check path `/health`.)
3. Set the environment variables Render marks as `sync: false`:
   - `DATABASE_URL` — from step 1
   - `CLIENT_URL` — your Netlify URL, e.g. `https://stadium-os.netlify.app` (set after step 3 below;
     you can redeploy once you have it)
   - `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` — optional; without
     these, uploaded images are stored on Render's local disk and are **not** persisted across
     deploys, so setting Cloudinary is recommended for production
   - `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` — optional; without these,
     emails go to an auto-created Ethereal test inbox (fine for a demo, not for real users)
   - `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `QR_SIGNING_SECRET` — Render's `generateValue: true`
     auto-generates strong secrets; leave as-is
4. Deploy. On first boot the start command runs `prisma migrate deploy`, applying all migrations
   to your database. Run the seed script once manually from the Render shell (or locally against
   the same `DATABASE_URL`):
   ```bash
   npx prisma db seed
   ```
5. Note your backend's public URL, e.g. `https://stadium-os-backend.onrender.com`.

## 3. Frontend — Netlify

1. In Netlify, **Add new site → Import an existing project**, point at the repo.
2. Base directory: `frontend`. Build command: `npm run build`. Publish directory: `frontend/dist`
   (Netlify auto-detects both from `frontend/netlify.toml`).
3. Set environment variables (Site configuration → Environment variables):
   - `VITE_API_URL` = `https://stadium-os-backend.onrender.com/api`
   - `VITE_SOCKET_URL` = `https://stadium-os-backend.onrender.com`
4. Deploy. Note your Netlify URL, e.g. `https://stadium-os.netlify.app`.
5. Go back to Render and set `CLIENT_URL` to that Netlify URL, then redeploy the backend — this is
   required for CORS and Socket.IO to accept requests from your frontend's origin.

## 4. Verify

- Visit the Netlify URL, log in with a seeded demo account (see README).
- Open `https://<render-backend>/api/docs` to confirm the Swagger UI and API are live.
- Confirm the Dashboard shows non-zero KPIs and a value updates without a manual refresh
  (Socket.IO connectivity check).

## Notes on Render's free tier

Free Render web services spin down after inactivity; the first request after idling can take
30–60 seconds to wake up (including the live-data simulator and Socket.IO connections). This is a
platform limitation, not an application bug — upgrade to a paid instance type for always-on
behavior in a real event deployment.
