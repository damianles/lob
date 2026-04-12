/**
 * Import posted-load rows into LaneRateObservation for rolling DB benchmarks.
 * Uses canonicalCityKey (Ft/Fort etc.). Optional posted-date column; else --as-of or today UTC.
 *
 *   npx tsx scripts/import-posted-xlsx-observations.ts /path/to.xlsx [--replace-import] [--as-of=YYYY-MM-DD]
 *
 * --replace-import: DELETE all observations where source = IMPORT, then insert (safe re-run).
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { OfferCurrency, Prisma, RateObservationSource } from "@prisma/client";
import XLSX from "xlsx";

import { canonicalCityKey } from "../src/lib/city-canonical";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function loadEnvCadRate(): number {
  for (const name of [".env.local", ".env"]) {
    const p = path.join(root, name);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf-8").split("\n")) {
      const t = line.trim();
      if (t.startsWith("LOB_CAD_TO_USD_RATE=")) {
        const v = Number(t.split("=")[1]?.replace(/['"]/g, "").trim());
        if (Number.isFinite(v)) return v;
      }
    }
  }
  return Number(process.env.LOB_CAD_TO_USD_RATE ?? "0.73");
}

const CA_PROVINCES = new Set([
  "AB",
  "BC",
  "MB",
  "NB",
  "NL",
  "NS",
  "NT",
  "NU",
  "ON",
  "PE",
  "QC",
  "SK",
  "YT",
]);

const MIN_USD = 150;
const MAX_USD = 80000;

function parseLocation(raw: unknown) {
  const t = String(raw ?? "").trim().replace(/\s+/g, " ");
  if (!t) return null;
  const idx = t.lastIndexOf("_");
  if (idx <= 0) return null;
  const city = t.slice(0, idx).trim();
  let st = t.slice(idx + 1).trim().toUpperCase();
  if (st.length > 2) st = st.slice(0, 2);
  if (city.length < 2 || st.length !== 2) return null;
  return { city, state: st };
}

function parseAmount(v: unknown): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const s = String(v).replace(/[$,]/g, "").replace(/\s*CAD\s*/gi, "").replace(/\s*USD\s*/gi, "").trim();
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function toUsd(amount: number, originState: string, destState: string, cadToUsd: number): number {
  const ca = CA_PROVINCES.has(originState) && CA_PROVINCES.has(destState);
  if (ca) return amount * cadToUsd;
  return amount;
}

function cellToDate(val: unknown, fallback: Date): Date {
  if (val instanceof Date && !Number.isNaN(val.getTime())) {
    return val;
  }
  if (typeof val === "number" && val > 20000 && val < 60000) {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    const ms = epoch.getTime() + Math.round(val * 86400000);
    const d = new Date(ms);
    if (!Number.isNaN(d.getTime())) return d;
  }
  const s = String(val).trim();
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) {
    const d = new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2]));
    if (!Number.isNaN(d.getTime())) return d;
  }
  return fallback;
}

function parseArgs() {
  const args = process.argv.slice(2).filter((a) => a !== "--");
  const replaceImport = args.includes("--replace-import");
  const asOfArg = args.find((a) => a.startsWith("--as-of="));
  const asOf = asOfArg ? new Date(asOfArg.slice("--as-of=".length)) : null;
  const pathArg = args.find((a) => !a.startsWith("--"));
  return { replaceImport, asOf: asOf && !Number.isNaN(asOf.getTime()) ? asOf : null, pathArg };
}

async function main() {
  const { prisma } = await import("../src/lib/prisma");
  const cadToUsd = loadEnvCadRate();
  const { replaceImport, asOf, pathArg } = parseArgs();
  const xlsxPath =
    pathArg || path.join(process.env.HOME ?? "", "Downloads", "WholeSaler_Trucker_Lists.xlsx");

  if (!existsSync(xlsxPath)) {
    console.error("File not found:", xlsxPath);
    process.exit(1);
  }

  const defaultObserved = asOf ?? new Date();

  const wb = XLSX.readFile(xlsxPath, { cellDates: true });
  const sheetNames = [
    "POSTED_LOADS_BY_BUYER",
    "POSTED_LOADS_BY_MILL",
    "POSTED_LOADS_BY_SHIPPERS",
  ];

  const rows: Prisma.LaneRateObservationCreateManyInput[] = [];

  for (const name of sheetNames) {
    if (!wb.SheetNames.includes(name)) continue;
    const sh = wb.Sheets[name];
    const matrix = XLSX.utils.sheet_to_json(sh, { defval: "", header: 1 }) as unknown[][];
    if (!matrix.length) continue;
    const header = (matrix[0] as string[]).map((h) => String(h).trim());
    const idx = {
      origin: header.findIndex((h) => /origin.*city/i.test(h)),
      dest: header.findIndex((h) => /destination.*city/i.test(h)),
      amount: header.findIndex((h) => /^amount$/i.test(h)),
      date: header.findIndex((h) =>
        /posted\s*date|submission\s*date|post\s*date|load\s*date|^date$/i.test(h),
      ),
    };
    if (idx.origin < 0 || idx.dest < 0 || idx.amount < 0) {
      console.warn(`[skip ${name}] bad header`, header);
      continue;
    }

    for (let r = 1; r < matrix.length; r++) {
      const row = matrix[r] as unknown[];
      const o = parseLocation(row[idx.origin]);
      const d = parseLocation(row[idx.dest]);
      const amt = parseAmount(row[idx.amount]);
      if (!o || !d || amt == null) continue;

      const observedAt =
        idx.date >= 0 ? cellToDate(row[idx.date], defaultObserved) : defaultObserved;

      const rateNative = amt;
      const offerCurrency = CA_PROVINCES.has(o.state) && CA_PROVINCES.has(d.state) ? "CAD" : "USD";
      const rateUsd = toUsd(rateNative, o.state, d.state, cadToUsd);
      if (rateUsd < MIN_USD || rateUsd > MAX_USD) continue;

      rows.push({
        observedAt,
        originState: o.state,
        destState: d.state,
        originCityCanon: canonicalCityKey(o.city),
        destCityCanon: canonicalCityKey(d.city),
        originZip5: "",
        destZip5: "",
        equipmentNorm: "*",
        rateUsd: new Prisma.Decimal(rateUsd.toFixed(2)),
        offerCurrency: offerCurrency === "CAD" ? OfferCurrency.CAD : OfferCurrency.USD,
        source: RateObservationSource.IMPORT,
      });
    }
  }

  if (replaceImport) {
    const del = await prisma.laneRateObservation.deleteMany({
      where: { source: RateObservationSource.IMPORT },
    });
    console.log(`Removed ${del.count} prior IMPORT observations.`);
  }

  const batch = 500;
  for (let i = 0; i < rows.length; i += batch) {
    const chunk = rows.slice(i, i + batch);
    await prisma.laneRateObservation.createMany({ data: chunk });
  }

  console.log(`Inserted ${rows.length} IMPORT observations.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
