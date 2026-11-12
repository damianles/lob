# LOB — where we are

**As of:** 12 Nov 2026 (supplier Post a Load nav; decline → exclude/tier; diligence on requests/prefs; Firm Rate take confirm; no completion invoice in path)  
**This file is the product snapshot.** `AGENTS.md` is the code map. Do not treat chat history as current.

Update this file when something **material** changes (shipped feature, explicit deferral, launch blocker). Skip drive-by session notes.

---

## What it is

**Lumber One Board** is a B2B load board for forest products freight. Suppliers (mills / wholesalers) post loads. Carriers (asset-based, brokers, owner-ops) book or bid. Ops then run **dispatch → carrier pickup check-in → delivery check-in**.

Signup collects a W-9 and credit reference (insurance for carriers), business phone, optional billing address, and clickwrap legal acceptances. After a booking, each side can open the other’s credit file. LOB does not score credit. Admin must mark credit docs verified before Approve.

**Core lifecycle:** post load → carrier requests Firm Rate or bids → **supplier Accept/Decline that carrier** → dispatch packet → carrier marks picked up → carrier uploads signed BOL → carrier marks delivered → **supplier confirms delivery**.

LOB tracks status only. It is not part of freight settlement (no platform completion invoice in the product path). Rate-con / BOL / haul sheet stay as downloadable paperwork parties attach in Outlook themselves.

Firm Rate is no longer an instant book. `POST /api/loads/:id/book` creates a pending `LoadBid` (`kind: TAKE`) at the posted rate; Accept creates the `Booking`. Open Bid and counters already used the same Accept/Decline path. Decline leaves the load open (does not auto-exclude the carrier). Credit file access remains post-booking only.

---

## Who uses it

| Persona | App role | What they do |
|---------|----------|----------------|
| Mill / wholesaler | `SHIPPER` | Post loads (Firm Rate or Open bid), review bids/counters, track own shipments (live Posted → Booked → Picked up → Delivered), exclude/tier carriers |
| Carrier dispatcher | `DISPATCHER` | Browse open loads, book Firm Rate or bid, post capacity, dispatch drivers, mark picked up / delivered, carrier profile (DOT/MC/fleet) |
| Driver | token links, no account | Driver haul sheet (rates never shown) |
| Damia / ops | `ADMIN` | Approve carriers and suppliers (docs-verified gate), companies, Test Lab persona preview |

Onboarding is at `/onboarding` after Clerk sign-up. Production company create requires a signed-in Clerk user.

Production topology: **Vercel** (`lob`) + **Supabase Postgres** + **Clerk** (`app_3B0GZBYUj2l8zOryfv6HA27cfQh`). Local: native Postgres `lob` on `localhost:5432`, **no Docker**.

---

## Legal (clickwrap)

Platform Terms, Privacy Policy, Supplier Agreement, and Carrier Agreement ship as version **`2026.09.30-draft`** (`isDraft: true`) in `src/lib/legal/documents.ts`. Acceptances store document key, version, IP, and user agent. **Counsel review is still pending** — bump version and clear `isDraft` when counsel signs off.

---

## Marketplace safety gates

| Gate | Behavior |
|------|----------|
| Auto-approve | `LOB_AUTO_APPROVE_*` ignored on Vercel Production (unless preview-admin tools explicitly allowed). Prod project currently has these vars unset. |
| Admin approve | Requires `creditDocsVerifiedAt` after opening W-9 / credit (and insurance for carriers). |
| Admin signup email | On company create, SMTP email to `LOB_ADMIN_NOTIFY_EMAILS` (else auto-admin emails) plus DB `ADMIN` users, with link to `/admin/carriers` or `/admin/suppliers`. |
| Post / book | Company `verificationStatus === APPROVED`. |
| Carrier insurance | Latest `INSURANCE` COI must be unexpired (UTC) to book, bid, or post capacity. Email at ≤30 days via daily cron `/api/cron/insurance-expiry` (`CRON_SECRET`). COI filing stores cargo + auto liability USD limits. Admin must **Confirm insurance matches input** (open COI, match amounts) before Mark docs verified / Approve; re-upload clears verification. Scorecard shows LOB-confirmed vs pending. |
| Carrier scorecard | After book: compliance passport (status only), coverage limits, booked/delivered/delivery %, on-time check-in % (requested day windows, not GPS). |
| Credit file | Counterparty only after a shared booking; HTTPS links required. |
| Unsigned create | Blocked outside local/dev (`allowUnsignedCompanyCreate`). |

---

## Explicitly deferred

| Item | Rule |
|------|------|
| In-app email | Live for load alerts when Google SMTP is set (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`, `NOTIFICATION_FROM_EMAIL`). Preferences at `/settings/notifications`. PDF packets are still downloaded and attached in Outlook by hand. |
| **Insights product (nav + `/insights` pages)** | Hidden for carriers, suppliers, and guests. Routes redirect home. Market-rate chips / lane decision stats are not shown to customers. Do not re-expose without an explicit product decision. |
| Insights as a paid monthly add-on | Still future. Do not build billing. |
| Facility / yard / driver QR | Deferred. No pickup/delivery/driver QR in product UI. `/scan/*` and `/facility/*` redirect. Carrier check-in + required signed BOL + supplier confirm delivery. |
| Completion invoice in product path | Deferred / out of product. LOB does not settle or invoice the move. `/loads/:id/invoice` may still exist in code; no UI CTAs. Supplier confirm delivery closes the shipment status. |
| Docker on this machine | Virtualization disabled. Native Postgres. |

## Internal lane / usage intel (kept)

- **DB:** every post/book still writes/updates `LaneRateObservation` (and static `data/market-benchmarks.json` remains).
- **Admin UI:** `/admin/marketplace-intel` — top lanes, active shippers/carriers, thin lanes (ADMIN only).
- **CLI:** `npm run report:marketplace-intel` (optional `DAYS=30`) for JSON export used in targeting.

---

## How a new chat should use this

```
Read AGENTS.md and docs/STATUS.md.
Task: [one sentence — what + where]
Do not change: [auth / schema / unrelated files]
```

If this file disagrees with the code, **the code and `git status` win**. Then update this file.
