# LOB — where we are

**As of:** 30 Sep 2026 (facility QR deferred; carrier check-in + supplier live stages)  
**This file is the product snapshot.** `AGENTS.md` is the code map. Do not treat chat history as current.

Update this file when something **material** changes (shipped feature, explicit deferral, launch blocker). Skip drive-by session notes.

---

## What it is

**Lumber One Board** is a B2B load board for forest products freight. Suppliers (mills / wholesalers) post loads. Carriers (asset-based, brokers, owner-ops) book or bid. Ops then run **dispatch → carrier pickup check-in → delivery check-in**.

Signup collects a W-9 and credit reference (insurance for carriers), business phone, optional billing address, and clickwrap legal acceptances. After a booking, each side can open the other’s credit file. LOB does not score credit. Admin must mark credit docs verified before Approve.

**Core lifecycle:** post load → book (or accept a bid) → dispatch packet → carrier marks picked up → carrier marks delivered → supplier confirms delivered (mutual close unlocks completion invoice + signed BOL on file).

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
| Post / book | Company `verificationStatus === APPROVED`. |
| Credit file | Counterparty only after a shared booking; HTTPS links required. |
| Unsigned create | Blocked outside local/dev (`allowUnsignedCompanyCreate`). |

---

## Explicitly deferred

| Item | Rule |
|------|------|
| In-app email / SMTP / Resend | Deferred. Outlook-manual PDF attach. |
| **Insights product (nav + `/insights` pages)** | Hidden for carriers, suppliers, and guests. Routes redirect home. Market-rate chips / lane decision stats are not shown to customers. Do not re-expose without an explicit product decision. |
| Insights as a paid monthly add-on | Still future. Do not build billing. |
| Facility pickup / delivery QR (yard & receiver links) | Deferred. Nav and load QR panels removed; `/scan/pickup` and `/scan/delivery` redirect. Revisit whether facility QR makes sense before re-enabling. Carrier check-in remains. |
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
