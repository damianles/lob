# LOB Web App (MVP Foundation)

## Deploy looks old on Vercel?

**→ Open [`PUSH_AND_VERCEL.md`](./PUSH_AND_VERCEL.md)** — the full app was only committed locally until recently; you must **push to GitHub** and set Vercel **Root Directory empty**.

---

This is the Lumber One Board platform:

- Next.js app router frontend
- Prisma + PostgreSQL data model
- API lifecycle: load posting -> booking -> dispatch -> pickup confirmation -> POD upload

## Prerequisites

- Node.js 20+
- PostgreSQL running locally or remotely

## 1) Environment setup

Copy `.env.example` to `.env` and set your database URL:

```bash
cp .env.example .env
```

## 2) Install and initialize DB

```bash
npm install
npm run db:up
npm run db:generate
npm run db:migrate -- --name init
npm run db:seed
```

## 3) Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## API quick test flow

1) Create a load as shipper (replace IDs with seeded IDs from `npm run db:seed` output):

```bash
curl -X POST http://localhost:3000/api/loads \
  -H "Content-Type: application/json" \
  -H "x-user-id: SHIPPER_USER_ID" \
  -H "x-company-id: SHIPPER_COMPANY_ID" \
  -d '{
    "originCity":"Tacoma",
    "originState":"WA",
    "originZip":"98402",
    "destinationCity":"Boise",
    "destinationState":"ID",
    "destinationZip":"83702",
    "weightLbs":43000,
    "equipmentType":"Flatbed",
    "isRush":true,
    "isPrivate":false,
    "offeredRateUsd":3400
  }'
```

2) Book the load:

```bash
curl -X POST http://localhost:3000/api/loads/LOAD_ID/book \
  -H "Content-Type: application/json" \
  -d '{
    "carrierCompanyId":"CARRIER_COMPANY_ID",
    "agreedRateUsd":3450
  }'
```

3) Create dispatch link:

```bash
curl -X POST http://localhost:3000/api/loads/LOAD_ID/dispatch \
  -H "Content-Type: application/json" \
  -d '{
    "assignedByUserId":"DISPATCHER_USER_ID",
    "driverName":"Chris Driver",
    "driverPhone":"+15551234567",
    "expiresInHours":48
  }'
```

4) Driver confirms pickup:

```bash
curl -X POST http://localhost:3000/api/dispatch-links/TOKEN/pickup \
  -H "Content-Type: application/json" \
  -d '{
    "pickupCode":"UNIQUE_PICKUP_CODE"
  }'
```

5) Driver submits POD:

```bash
curl -X POST http://localhost:3000/api/dispatch-links/TOKEN/pod \
  -H "Content-Type: application/json" \
  -d '{
    "fileUrl":"https://example.com/pod-image.jpg"
  }'
```

## Notes

- Auth is currently a temporary header-based shim for fast MVP testing.
- Clerk is now integrated; set Clerk keys in `.env` to enable sign-in/sign-up.
- Header fallback remains temporarily for local testing while user-role sync is finalized.
- GPS, lane pricing analytics, and factoring automation are intentionally phase-gated.

## Deploy

See full deploy guide:

- `../docs/13-vercel-deployment-and-partner-testing.md`

## Brand assets delivered

- Approved concept files and generated app icons: `public/brand/approved/`
- Prior draft files retained in: `public/brand/final/`
- App icon wired at: `src/app/icon.png`
