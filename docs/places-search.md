# Place search (city + address)

LOB uses **Google Places** (Autocomplete + Place Details) and **Directions** (route insights) through **server-side** API routes. The browser never sees `GOOGLE_MAPS_API_KEY`.

---

## Google Cloud (one-time / ops)

1. **Project**  
   Open [Google Cloud Console](https://console.cloud.google.com/) and select (or create) the project for this app. You can use one project for both Places and Directions; the same key is fine if the APIs are enabled for it.

2. **Billing**  
   **Billing** must be enabled for the project. Maps Platform products (Places, Directions) are billable; Google often provides credits or a monthly free usage band—see current [Maps pricing](https://developers.google.com/maps/billing-and-pricing/pricing).

3. **Enable APIs**  
   **APIs & services → Library** (or “Enabled APIs & services” → **+ Enable APIs and services**). Search for and enable at least:
   - **Places API** — needed for **Place Autocomplete** and **Place Details** (used by `/api/places/*`).
   - **Directions API** — needed for driving distance / route features (e.g. `/api/insights/route-planning`).

   If you use the newer “Places API (New)”, still ensure your chosen endpoints match what the app calls (this codebase uses the classic **Places Autocomplete** and **Place Details** web service URLs in `app/api/places/*`).

4. **Create an API key**  
   **APIs & services → Credentials → Create credentials → API key**. Copy the key (you will paste it only into env, not into client code).

5. **Restrict the key (recommended)**  
   On the key → **API restrictions**: restrict to **Places API** and **Directions API** (and any other Maps APIs you actually use).  
   **Application restrictions** (choose one):
   - **IP addresses** — for calls only from your **server** (e.g. Vercel static egress / allowlist if Google’s docs list them for your region, or a narrow range you control). This matches “server-only” Next.js route handlers.
   - **None** for development is common; **do not** use “HTTP referrers” for keys used only in **server** routes—referrers are for browser clients.

6. **Wait a few minutes** after enabling APIs or changing restrictions before testing.

---

## Where to put the key (this repo)

| Environment | What to do |
|---------------|------------|
| **Local dev** | In the **`web/`** app folder, set `GOOGLE_MAPS_API_KEY` in **`.env`** or **`.env.local`** (both are loaded by Next.js; prefer `.env.local` for machine-specific secrets and keep it out of git). See `web/.env.example` for the line to copy. Restart `npm run dev` after changes. |
| **Production (Vercel)** | Vercel project → **Settings → Environment Variables** → add **`GOOGLE_MAPS_API_KEY`** = your key, for **Production** (and **Preview** if you want it on PR previews). **Redeploy** so serverless functions pick up the new value. |

The app reads the variable only in server code (e.g. `process.env.GOOGLE_MAPS_API_KEY` in `app/api/places/autocomplete`, `app/api/places/details`, and route planning).

**Name must match exactly:** `GOOGLE_MAPS_API_KEY` (no `NEXT_PUBLIC_` prefix—do not expose this to the client).

---

## Behavior without a key

Without `GOOGLE_MAPS_API_KEY`, the post form may show a short note; users can still type locations manually. Built-in **datalists** (company-scoped recent addresses) still work.

---

## Where it appears in the UI

- **Post load** (suppliers): lane (geocode), address search on all pickup and delivery rows when you use more than one stop; manual fields still available.
- **Load board:** From / To place search (fills the “filter text”); **EMR** section fills your ZIP from a place if needed.
- **Shipments** tab: origin/destination place search to fill the lane filter fields.
- **Capacity** (shippers and carriers): optional place search to fill origin/dest ZIPs.
- **Insights → Lanes** (subscribers): place search for origin/destination, filling city and state.
- **Insights → fuel** route block: place search, then the route string fields (still editable before submit).

**Requirements:** sign in to the app (autocomplete and details are **not** public), and set `GOOGLE_MAPS_API_KEY` in **local env** and on **Vercel** for production.

---

## Reuse in code

Use `<PlaceAutocomplete mode="city" | "address" | "geocode" />` from `src/components/place-autocomplete.tsx` and handle `onResolved` with `ParsedPlace` + lat/lng from the details response.

---

## Alternatives

- **Mapbox / HERE / etc.** — same proxy idea: add server routes, swap API URLs, keep the key on the server.
- **No third party** — improve `/api/lanes/recent-addresses` + `datalist` (company-scoped only).
