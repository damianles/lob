/**
 * Import posted-load rows from the wholesaler XLSX into LaneRateObservation
 * for rolling DB benchmarks (lane analytics, post form, rate floor).
 *
 *   npx tsx scripts/import-posted-xlsx-observations.ts /path/to.xlsx [--replace-import] [--as-of=YYYY-MM-DD]
 *
 * --replace-import: DELETE all observations where source = IMPORT, then insert (safe re-run).
 *
 * Sheets: POSTED_LOADS_BY_BUYER, POSTED_LOADS_BY_MILL, POSTED_LOADS_BY_SHIPPERS
 * Headers: Origin City, Destination City, Amount (CAD for Canada–Canada, native amount in rateUsd).
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { OfferCurrency, Prisma, RateObservationSource } from "@prisma/client";
import XLSX from "xlsx";

import { canonicalCityKey } from "../src/lib/city-canonical";
import { inferOfferCurrency, parsePostedLocationCell } from "../src/lib/lane-currency";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const MIN_RATE = 50;
const MAX_RATE = 120_000;

function parseAmount(v: unknown): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const s = String(v).replace(/[$,]/g, "").replace(/\s*CAD\s*/gi, "").replace(/\s*USD\s*/gi, "").trim();
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
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
  const { replaceImport, asOf, pathArg } = parseArgs();
  const primary = pathArg || path.join(root, "data", "lane-imports", "WholeSaler_Trucker_Lists.xlsx");
  const fallbackDl = path.join(process.env.HOME ?? "", "Downloads", "WholeSaler_Trucker_Lists.xlsx");
  const xlsxPathFinal = existsSync(primary) ? primary : existsSync(fallbackDl) ? fallbackDl : null;
  if (!xlsxPathFinal) {
    // eslint-disable-next-line no-console
    console.error("XLSX not found. Tried:", primary, "and", fallbackDl);
    process.exit(1);
  }
  if (xlsxPathFinal === fallbackDl && !pathArg) {
    // eslint-disable-next-line no-console
    console.log("Using:", xlsxPathFinal);
  }

  const defaultObserved = asOf ?? new Date();

  const wb = XLSX.readFile(xlsxPathFinal, { cellDates: true });
  const sheetNames = ["POSTED_LOADS_BY_BUYER", "POSTED_LOADS_BY_MILL", "POSTED_LOADS_BY_SHIPPERS"];

  const rows: Prisma.LaneRateObservationCreateManyInput[] = [];
  const dedup = new Set<string>();

  for (const name of sheetNames) {
    if (!wb.SheetNames.includes(name)) {
      // eslint-disable-next-line no-console
      console.warn("[skip] sheet not in workbook:", name);
      continue;
    }
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
      // eslint-disable-next-line no-console
      console.warn(`[skip ${name}] bad header`, header);
      continue;
    }

    for (let r = 1; r < matrix.length; r++) {
      const row = matrix[r] as unknown[];
      const o = parsePostedLocationCell(row[idx.origin]);
      const d = parsePostedLocationCell(row[idx.dest]);
      const amt = parseAmount(row[idx.amount]);
      if (!o || !d || amt == null) continue;

      if (amt < MIN_RATE || amt > MAX_RATE) continue;

      const offerCurrency = inferOfferCurrency(o.state, d.state);

      const observedAt =
        idx.date >= 0 ? cellToDate(row[idx.date], defaultObserved) : defaultObserved;
      const day = observedAt.toISOString().slice(0, 10);

      const canonO = canonicalCityKey(o.city);
      const canonD = canonicalCityKey(d.city);
      const dedupKey = `${canonO}|${o.state}|${canonD}|${d.state}|${amt.toFixed(2)}|${day}`;
      if (dedup.has(dedupKey)) continue;
      dedup.add(dedupKey);

      rows.push({
        observedAt,
        originState: o.state,
        destState: d.state,
        originCityCanon: canonO,
        destCityCanon: canonD,
        originZip5: "",
        destZip5: "",
        equipmentNorm: "*",
        rateUsd: new Prisma.Decimal(amt.toFixed(2)),
        offerCurrency: (offerCurrency === "CAD" ? OfferCurrency.CAD : OfferCurrency.USD),
        source: RateObservationSource.IMPORT,
      });
    }
  }

  if (replaceImport) {
    const del = await prisma.laneRateObservation.deleteMany({
      where: { source: RateObservationSource.IMPORT },
    });
    // eslint-disable-next-line no-console
    console.log(`Removed ${del.count} prior IMPORT observations.`);
  }

  const batch = 500;
  for (let i = 0; i < rows.length; i += batch) {
    const chunk = rows.slice(i, i + batch);
    await prisma.laneRateObservation.createMany({ data: chunk });
  }

  // eslint-disable-next-line no-console
  console.log(`Inserted ${rows.length} distinct IMPORT lane observations (deduped by lane+amount+day).`);
  await prisma.$disconnect();
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
