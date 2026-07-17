# Smart Stadium OS + Digital Twin

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

## Scripts (root)

- `npm run dev` — run backend + frontend together
- `npm run build` — production build of both apps
- `npm run prisma:migrate` / `npm run prisma:seed` / `npm run prisma:studio`

## Testing

Both apps use Vitest. Run from each workspace:

```bash
cd backend && npm run test   # JWT sign/verify, QR ticket signature verification + tamper
                              # detection, round-robin schedule generator correctness
cd frontend && npm run test  # utils (cn/formatCurrency/formatNumber), RBAC nav filtering,
                              # component render tests
```

Coverage is intentionally focused on pure logic that's cheap to test in isolation (crypto/signing,
scheduling algorithms, RBAC filtering) rather than full integration tests against a live database,
which would require a dedicated test database out of scope for this build.

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for the full Netlify + Render + Neon guide.
