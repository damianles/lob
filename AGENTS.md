# AGENTS.md — LOB (Lumber One Board)

Read this at the start of a feature chat. Do **not** re-explore the entire repo unless the task requires discovery.

**User workflow:** `docs/WORKFLOW.md`  
**Always-on rules:** `.cursor/rules/lob-core.mdc`

---

## What this app is

B2B load board for forest products: **suppliers** post loads, **carriers** book them, ops track **dispatch → pickup → POD**.

**Core lifecycle:** post load → book → dispatch link → driver pickup confirm → POD upload.

---

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 16 App Router, React 19, Tailwind 4 |
| Auth | Clerk (`@clerk/nextjs`), `ClerkProvider` in `src/app/layout.tsx` |
| Middleware | `src/proxy.ts` (`clerkMiddleware`) — protected: `/admin`, `/insights`, `/shipments`, related APIs |
| Database | Prisma 7 + PostgreSQL |
| Validation | Zod (`src/lib/validation.ts`) |

**Clerk application ID:** `app_3B0GZBYUj2l8zOryfv6HA27cfQh`

---

## Repository layout

```
src/
  app/              # Routes (App Router)
    page.tsx        # Home / load board
    onboarding/     # Supplier vs carrier account setup
    admin/          # Admin: carriers, suppliers, companies, test-lab
    api/            # REST handlers (loads, companies, admin, webhooks, …)
    loads/[loadId]/ # Shipment detail, BOL, rate con
    capacity/       # Carrier capacity offers
    insights/       # Lane / fuel analytics
    shipments/      # Shipments list (`/booked` redirects here)
    sign-in/ sign-up/
  components/       # UI (load-board-workspace, app-nav, lob-sidebar, …)
  lib/              # Business logic, prisma client, auth sync, permissions
  proxy.ts          # Clerk middleware (Next.js 16 proxy convention)
prisma/
  schema.prisma     # Data model
  migrations/       # Production migrate history
  seed.ts           # Local test companies/users
scripts/            # Admin setup, benchmarks, brand assets
public/brand/       # Approved brand assets
```

---

## Roles & permissions

| Role | Typical use |
|------|-------------|
| `ADMIN` | Admin nav, carrier/supplier approval, test lab; no `companyId` |
| `SHIPPER` | Supplier — post loads |
| `DISPATCHER` | Carrier — book loads, capacity |

- Onboarding: `src/app/onboarding/` + `POST /api/companies`
- User sync: `src/lib/sync-clerk-user.ts`, `src/lib/clerk-user-merge.ts`
- Permissions: `src/lib/actor-permissions.ts`, `src/lib/request-context.ts`
- Admin persona switch (preview): `LOB_ALLOW_ADMIN_PERSONA_SWITCH`, `/admin/test-lab`

---

## Local development (Damia — Windows)

| Item | Value |
|------|--------|
| Root | `C:\Users\damia\Projects\lob` |
| Env file | `.env` (from `.env.example`; gitignored) |
| Database | Native **PostgreSQL 16** on `localhost:5432`, database **`lob`** |
| Docker | **Not used** locally (virtualization unavailable) |

### Env vars (names only — never commit values)

- `DATABASE_URL` — local postgres or Supabase direct URL for migrations
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` — required for auth
- `CLERK_WEBHOOK_SIGNING_SECRET` — optional locally
- Optional preview: `LOB_AUTO_APPROVE_CARRIERS`, `LOB_AUTO_APPROVE_SUPPLIERS`, `LOB_AUTO_ADMIN_EMAILS`, `LOB_ALLOW_ADMIN_PERSONA_SWITCH`, `NEXT_PUBLIC_LOB_DEMO_MODE`

### Commands

```powershell
cd C:\Users\damia\Projects\lob
npm install
npm run db:generate

# Fresh local DB (see migration note below):
npx prisma db push
npm run db:seed

# Dev server (PowerShell script policy workaround):
& "C:\Program Files\nodejs\npm.cmd" run dev
```

Health check: `GET /api/health`  
DB ping: `npm run db:ping`

### Local migration quirk

Migration `20260403120000_capacity_dates_carrier_profile` alters `CapacityOffer` before migration `20260411175006` creates it. On a **fresh** local database, `npm run db:migrate` may fail.

- **Local fix:** `npx prisma db push` + `npm run db:seed`
- **Production / Supabase:** use `npm run db:deploy` (existing DBs already applied in order)

---

## Production topology

| Service | Role |
|---------|------|
| **Vercel** | Hosts Next.js |
| **Supabase** | PostgreSQL (`DATABASE_URL` = **pooler** on Vercel) |
| **Clerk** | Auth |

See `DEPLOY.md`, `SHIP.md`. Migrations from laptop: direct Supabase URL + `npx prisma migrate deploy`.

---

## Coding conventions

- **Minimal scope** — smallest correct diff; no unrelated changes
- **Match existing patterns** — naming, imports, component style in neighboring files
- **`await auth()`** — Clerk server auth is async
- **No secrets in client** — only `NEXT_PUBLIC_*` in browser code
- **Comments** — only for non-obvious business logic
- **Tests** — add only when requested or for meaningful behavior coverage
- **Commits / push** — only when the user explicitly asks

---

## Common entry points by task

| Task type | Start here |
|-----------|------------|
| Load board UI | `src/components/load-board-workspace.tsx`, `src/app/page.tsx` |
| Post load | `src/components/supplier-post-load-form.tsx`, `src/app/api/loads/route.ts` |
| Booking | `src/app/api/loads/[loadId]/book/` (grep), load detail pages |
| Onboarding | `src/app/onboarding/`, `src/app/api/companies/route.ts` |
| Admin queue | `src/app/admin/carriers/`, `src/app/admin/suppliers/` |
| Auth / session | `src/proxy.ts`, `src/lib/sync-clerk-user.ts` |
| Schema change | `prisma/schema.prisma` → migration → deploy docs |

---

## Agent session discipline

1. User's first message in a new chat → brief checklist from `docs/WORKFLOW.md` unless task is already scoped.
2. Read this file + `@` mentioned paths — avoid whole-repo search.
3. Ask one clarifying question if scope is ambiguous; don't guess across modules.
