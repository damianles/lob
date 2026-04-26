# Using your Excel (XLSX) data for analytics

LOB never reads an Excel file **on the web server** at request time. Your spreadsheet is used in **two** offline steps; both can target the **same** `WholeSaler_Trucker_Lists.xlsx` (or another file with the same sheet names and column patterns).

| What you want | Mechanism | Where it shows up |
|----------------|-----------|-------------------|
| **A) State-level benchmarks in Insights** (“spreadsheet vs your booked average”) | Build JSON from XLSX, **commit** it, deploy | `getAnalyticsOverview` → `spreadsheetBenchmarks` (reads `data/market-benchmarks.json`) |
| **B) Rolling “market” rates from your posted rows** (lane quote chip, min-rate logic, DB-backed benchmarks when sample count is high enough) | Import XLSX rows into Postgres **`LaneRateObservation`** (`source: IMPORT`) | `market-rate-lane.ts`, `/api/insights/lane-quote`, load APIs that use the benchmark window |

**Live bookings/loads in Insights** (loads posted, bookings, city lanes, etc.) always come from the **Postgres** `Load` / `Booking` tables for the environment. Excel does not replace that — it **supplements** benchmarks and observations.

---

## A) Rebuild `market-benchmarks.json` (shipped with the app)

1. Place or update the workbook (expected sheets: `POSTED_LOADS_BY_BUYER`, `POSTED_LOADS_BY_MILL`, `POSTED_LOADS_BY_SHIPPERS` — see `scripts/build-benchmarks-from-posted-xlsx.ts`).
2. From the **`web/`** directory:

   ```bash
   npm run benchmarks:build -- /path/to/YourSheet.xlsx
   ```

   (Omit the path to use defaults under `data/lane-imports/` or `~/Downloads/WholeSaler_Trucker_Lists.xlsx` if present.)

3. **Commit** the changed `data/market-benchmarks.json` (and `data/benchmark-insights.json` if it updates).
4. **Push to `main`** so Vercel deploys. The **production** app bundle then includes the new static benchmarks.

> If you only import into the DB (B) and never rebuild/commit (A), the **Insights “spreadsheet benchmark”** columns can still point at an **old** JSON file from the last build.

---

## B) Import rows into **production** `LaneRateObservation`

The import script uses **`DATABASE_URL`** from your environment (your local `.env` or a one-off `DATABASE_URL=...` prefix).

1. Get the **production** connection string (Vercel → Project → Settings → Environment Variables, or a Supabase “session / pooler” URL you already use in prod).

2. From **`web/`**:

   ```bash
   DATABASE_URL="postgresql://..." npx tsx scripts/import-posted-xlsx-observations.ts /path/to/YourSheet.xlsx --replace-import
   ```

   - `--replace-import` removes previous `source = IMPORT` rows, then inserts (safe to re-run when you refresh the sheet).
   - Optional: `--as-of=YYYY-MM-DD` for the observation date.

3. This **does not** require a new deploy. It only updates the **database** the live site already uses.

> **Caution:** Point `DATABASE_URL` at **production** on purpose. Importing to your **local** database only changes **local** analytics, not the live site.

---

## Tuning: when DB data overrides the static file

`LOB_MIN_SAMPLES_FOR_DB_BENCHMARK` and `LOB_BENCHMARK_WINDOW_DAYS` (see `.env.example`) control when rolling **`LaneRateObservation`** averages take precedence over `data/market-benchmarks.json` in market-rate code paths. Set these in Vercel env if you need different thresholds in production.

---

## Quick checklist

- [ ] **Insights** shows current spreadsheet benchmarks → rebuild (A), commit, push, deploy.  
- [ ] **Lane quote / market logic** uses imported posted rows in prod → run import (B) against **production** `DATABASE_URL`.  
- [ ] **Transaction analytics** (your loads/bookings) → that’s only what’s in **production** Postgres, not the Excel file itself.

See also: `data/lane-rate-base-source.json` (overview of the static file pipeline).
