# Smart Stadium OS + Digital Twin

[![CI](https://github.com/ShivaniKapase643/StadiumOS_AI/actions/workflows/ci.yml/badge.svg)](https://github.com/ShivaniKapase643/StadiumOS_AI/actions/workflows/ci.yml)

**An AI-powered intelligent stadium and tournament operations platform.**

An enterprise SaaS-style platform for running large-scale stadium events (FIFA World Cup, IPL,
Olympics, concerts). This is a real, fully-wired full-stack application — not a mockup. All 16
modules from the original spec are implemented and functional against a live PostgreSQL database:
four are full-depth, end-to-end builds (Dashboard, Stadium Digital Twin, Tournament Management,
Smart Ticketing); the remaining twelve are lightweight-but-real screens (real DB tables, real API
routes, real forms/actions) rather than dedicated deep modules. A public Landing Page, a one-click
**Live Demo mode**, a stadium-operator **Command Center**, and a rule-based **AI Insights** engine
sit on top of all of it.

## What's real vs. what's simulated

Everything in this repo runs against a live PostgreSQL database with real Prisma migrations, real
JWT auth, and a real Express API — there are no mock JSON files or hardcoded UI data. A few things
are intentionally simulated rather than wired to third parties, and are called out explicitly:

- **Payments** — a self-contained mock gateway (`backend/src/modules/ticketing/payment.service.ts`)
  with a realistic pending → success/failed flow. Swapping in Stripe/Razorpay later only touches
  this one file.
- **AI features & weather** — rule-based/statistical simulations (crowd density random-walk,
  equipment health drift, weather snapshots, the AI Insights recommendation engine, the fan-facing
  chatbot), not calls to an external LLM or weather API. This is a deliberate scope choice, not a
  placeholder — every "AI" module produces real output computed from live database state.
- **Live Demo mode** — a "Launch Live Demo" button on the landing page logs you in as the seeded
  Stadium Admin account and drops you into the Command Center. The backend's live data simulator
  (crowd density, parking occupancy, equipment health, security/medical alerts, and match score
  progression) runs continuously so the whole app feels alive without any IoT hardware or manual
  data entry.

Cloudinary (image uploads) and SMTP (emails) are env-driven with safe dev fallbacks: uploads land
on local disk under `backend/uploads/` and password-reset/booking emails go to an auto-created
Ethereal test inbox (a real, previewable inbox) when credentials aren't configured.

## Module depth

| Full-depth modules | Lightweight-but-real modules |
|---|---|
| Dashboard, Stadium Digital Twin, Tournament Management, Smart Ticketing | Crowd Intelligence, Smart Parking, Fan Experience, Vendor Management, Security Center, Emergency Response, Asset & Maintenance (+ Predictive Maintenance), Sustainability Dashboard, Reports & Analytics, Notification Center, Settings |

"Lightweight" means simpler UI polish and fewer edge cases handled — it does **not** mean fake.
Every lightweight module has real Prisma-backed CRUD endpoints, RBAC-gated actions, and functional
forms (e.g. Security Center lets you file an incident and send a broadcast; Emergency Response lets
you dispatch an ambulance; Smart Parking lets you reserve a real slot; Reports & Analytics exports
real CSV/PDF files).

## Tech stack

**Frontend** — React 19, Vite, TypeScript, Tailwind CSS, shadcn/ui-style components, React Router,
TanStack Query, Framer Motion, Recharts, React Hook Form + Zod, Axios, Leaflet + react-leaflet
(indoor `CRS.Simple` map) + leaflet.heat, Socket.IO client, html5-qrcode, jsPDF (report export).

**Backend** — Node.js, Express, TypeScript, Prisma ORM, PostgreSQL, JWT auth, Socket.IO, Multer +
Cloudinary, Nodemailer, Swagger (OpenAPI) docs.

**Deployment** — Frontend on Netlify, backend on Render, database on Neon/Supabase/Render Postgres.

## Project structure

```
StadiumOS_AI/
  backend/
    prisma/schema.prisma   # full schema, all 16 modules
    prisma/seed.ts         # demo users, stadium, tournament, tickets, baseline data for every module
    src/
      config/               # env, db, logger, socket, swagger
      middleware/           # auth, rbac, validation, error handling, upload
      modules/              # one folder per module — auth, dashboard, stadium-twin, tournaments,
                             # ticketing, ai, crowd-intelligence, parking, fan-experience, vendor,
                             # security, emergency, maintenance, sustainability, reports,
                             # notifications, settings
      simulation/            # live data simulator (crowd/parking/equipment/alerts/match scores)
      sockets/               # Socket.IO server + event names
      utils/                 # jwt, email, cloudinary, qrcode, apiResponse
  frontend/
    src/
      app/                  # router, providers
      components/ui/         # shadcn-style primitives
      components/shared/     # AppShell, Sidebar, Topbar, ProtectedRoute, RoleGate, StatCard, ChartCard
      features/               # one folder per module (landing, command-center, ai, dashboard,
                               # digital-twin, tournaments, ticketing, crowd-intelligence, parking,
                               # fan-experience, vendor, security, emergency, maintenance,
                               # sustainability, reports, notifications, settings)
      contexts/, hooks/, services/, lib/, types/
```

## Roles

`SUPER_ADMIN`, `STADIUM_ADMIN`, `TOURNAMENT_ORGANIZER`, `SECURITY_OFFICER`, `MEDICAL_TEAM`,
`MAINTENANCE_TEAM`, `VENDOR`, `VOLUNTEER`, `REFEREE`, `FAN`. Self-service registration is limited
to Fan/Volunteer/Vendor; other roles are provisioned via the seed script. Each module's nav
visibility and write actions are role-gated (see `frontend/src/lib/permissions.ts`).

## Local setup

Prerequisites: Node.js 20+, npm, and a PostgreSQL connection string (Neon/Supabase free tier work
well — see `DEPLOYMENT.md`).

```bash
# 1. Install dependencies (npm workspaces installs both apps)
npm install --legacy-peer-deps

# 2. Configure environment
cp backend/.env.example backend/.env      # fill in DATABASE_URL at minimum
cp frontend/.env.example frontend/.env    # optional in dev — Vite proxies /api and /socket.io

# 3. Run migrations and seed demo data
cd backend
npx prisma migrate dev --name init
npx prisma db seed
cd ..

# 4. Start both apps
npm run dev
# frontend: http://localhost:5173
# backend:  http://localhost:5000  (Swagger docs at /api/docs)
```

`--legacy-peer-deps` is needed because some ecosystem packages (e.g. `react-leaflet`) haven't
finished updating their peer-dependency ranges for React 19 yet.

### Fastest way to see it running: Live Demo

Visit the landing page (`/`) and click **Launch Live Demo** — no signup needed. It logs you in as
the seeded Stadium Admin and takes you straight to the Command Center, where the live data
simulator is already running.

### Demo credentials

The seed script creates one account per role, all with password `Password123!`:

| Role | Email |
|---|---|
| Super Admin | superadmin@stadiumos.dev |
| Stadium Admin | stadiumadmin@stadiumos.dev |
| Tournament Organizer | organizer@stadiumos.dev |
| Security Officer | security@stadiumos.dev |
| Medical Team | medical@stadiumos.dev |
| Maintenance Team | maintenance@stadiumos.dev |
| Vendor | vendor@stadiumos.dev |
| Volunteer | volunteer@stadiumos.dev |
| Referee | referee@stadiumos.dev |
| Fan | fan@stadiumos.dev |

## Security

- **Auth**: short-lived JWT access tokens + longer-lived refresh tokens, bcrypt (cost 12) password
  hashing. Every issued refresh token carries a random `jti`, so two logins for the same user in
  the same second can't collide on the DB's unique constraint. Refreshing rotates the token (the
  old one is revoked); **presenting an already-revoked refresh token is treated as a theft
  signal and revokes every session for that account**, not just the one in use.
- **Password policy**: 8-72 characters (bcrypt's own limit), must contain an uppercase letter,
  lowercase letter, number, and symbol — enforced identically on the client (inline, before
  submit) and server (`auth.validation.ts`, the authoritative check).
- **RBAC**: enforced at the API layer (`requireRole` middleware on every privileged route, backed
  by shared role-group constants in `middleware/rbac.ts`) and mirrored in the UI (`permissions.ts`
  filters nav/actions by role) — the UI layer is a UX convenience, not the security boundary.
- **Input validation**: every mutating route validates `req.body`/`req.query` against a Zod schema
  before the handler runs (`middleware/validate.ts`); malformed input never reaches a service or
  Prisma call.
- **SQL injection**: not reachable by construction — every database call goes through Prisma's
  parameterized query builder; there is no raw SQL (`$queryRaw`/`$executeRaw`) anywhere in the
  application code, only in Prisma's own generated migrations.
- **XSS**: React escapes all rendered content by default; the codebase contains zero uses of
  `dangerouslySetInnerHTML`.
- **CSRF / cookies**: intentionally not applicable, not overlooked. Auth is a JWT bearer token in
  the `Authorization` header, not an ambient cookie the browser attaches automatically — CSRF
  specifically exploits the latter, so there's no cookie-based session for it to target, and no
  session cookie whose `Secure`/`HttpOnly`/`SameSite` flags would need setting.
- **Tickets**: QR codes are HMAC-SHA256-signed and verified with a constant-time comparison
  (`crypto.timingSafeEqual`, not `===`) so a tampered ticket fails verification without leaking
  timing information about how close a forged signature came to matching.
- **Transport/headers**: Helmet's default header set on the API, CORS scoped to the configured
  frontend origin, a CSP on the Netlify-served frontend, and `express-rate-limit` (correctly
  scoped per-IP via `trust proxy` behind Render's reverse proxy — see the note in `app.ts`).
- **Secrets**: `requiredSecret()` in `config/env.ts` allows a dev-only fallback for JWT/QR
  signing secrets, but throws on startup if they're missing in production — no silent
  well-known-default signing key in a real deployment.

## Scripts (root)

- `npm run dev` — run backend + frontend together
- `npm run build` — production build of both apps
- `npm run prisma:migrate` / `npm run prisma:seed` / `npm run prisma:studio`

## Testing

Both apps use Vitest, with React Testing Library on the frontend and Supertest for the backend's
HTTP-level integration suite. CI (`.github/workflows/ci.yml`) runs all of it — typecheck, lint,
unit tests, integration tests, and a production build — on every push and PR, against a real
disposable Postgres 16 service container (not a mock).

```bash
# Backend
cd backend
npm run test                  # unit tests — pure logic, Prisma mocked
npm run test:integration      # integration tests — real Express app + real Postgres via Supertest
npm run test:coverage         # unit tests with a v8 coverage report
npm run test:coverage:integration

# Frontend
cd frontend
npm run test                  # component + hook tests (React Testing Library)
npm run test:coverage         # with a v8 coverage report
```

**What's covered:**

| Layer | Backend | Frontend |
|---|---|---|
| Auth | Register/login/refresh/logout, RBAC on privileged routes, **refresh-token rotation + reuse-detection** (a stolen/replayed token revokes every session for that account), deactivated-account login rejection | RBAC nav filtering (`permissions.test.ts`) |
| Ticketing | Full booking workflow (seat select → mock payment → QR issuance), seat-conflict (409), declined-payment rollback, **QR scan/verification** (valid, tampered, already-used), refunds, ownership checks | `SeatMap` — selection, disabled/booked seats, aria state, empty state |
| Tournaments | Create/list with pagination, RBAC, date-range validation (found via this test — endDate was never checked against startDate) | `TournamentsPage` — loading skeleton, data render, empty state, failed-fetch behavior, RBAC-gated create button |
| Digital Twin | Overview, zone CRUD, live snapshot (zones + parking + equipment + alerts), empty-zone-list state, 404s | — |
| Security / Emergency / Parking | Incident + SOS + reservation CRUD, RBAC, conflict/validation/ownership edge cases | — |
| Socket.IO | `emitToAll` broadcasts to the `broadcast` room with the right event name + payload; safe no-op before init | — |
| Shared | — | `PaginationControls`, `useCountUp` (reduced-motion + format-preservation branches), `Badge` |

Mocking: the ticketing integration suite mocks `payment.service` (an intentionally-random ~92%
success simulator) so payment-success and payment-decline paths are deterministic instead of
flaky; a separate unit suite mocks Prisma entirely to pin down `createBooking`'s validation/conflict
branches and `auth.service`'s edge cases in isolation, in milliseconds, with no database.

**Coverage, honestly reported** (v8, `coverage.all: true` so untested files count as 0% rather
than being silently omitted — see each `vitest.config.ts`):

| | Statements | Notes |
|---|---|---|
| Backend, unit suite only | ~8% | Low in isolation because most business logic is exercised by the *integration* suite instead (real DB, not mocked) — Vitest doesn't currently merge unit + integration coverage into one number in this setup. |
| Frontend | ~6% | 6 feature-level pages/hooks/components have real tests; the remaining ~15 feature pages, most services, and all dialogs are untested. |

These are not 95%+, and this README won't claim otherwise. The integration suite (auth, ticketing,
tournaments, twin, security, emergency, parking — ~65 assertions across 8 files) covers meaningfully
more real business logic than the unit-coverage number alone suggests, but an honest single number
for "how much of this app is tested" is still low. The highest-leverage next additions would be
integration tests for the remaining untested backend services (dashboard, fan-experience, vendor,
maintenance, notifications, reports, sustainability, ai) and component tests for the untested
frontend feature pages.

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for the full Netlify + Render + Neon guide.
