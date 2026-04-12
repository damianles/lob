/**
 * Build data/market-benchmarks.json (static fallback) from posted-load sheets.
 * Groups city pairs with canonicalCityKey so Ft McMurray / Fort McMurray merge.
 *
 * Run: npx tsx scripts/build-benchmarks-from-posted-xlsx.ts [path/to.xlsx]
 */
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import XLSX from "xlsx";

import { canonicalCityKey } from "../src/lib/city-canonical";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const MIN_USD = 150;
const MAX_USD = 80000;

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

const EQUIP_ANY = "*";

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

function reasonableUsd(usd: number) {
  return usd >= MIN_USD && usd <= MAX_USD;
}

function rowObjects(sheetName: string, matrix: unknown[][]) {
  if (!matrix.length) return [];
  const header = (matrix[0] as string[]).map((h) => String(h).trim());
  const idx = {
    origin: header.findIndex((h) => /origin.*city/i.test(h)),
    dest: header.findIndex((h) => /destination.*city/i.test(h)),
    amount: header.findIndex((h) => /^amount$/i.test(h)),
  };
  if (idx.origin < 0 || idx.dest < 0 || idx.amount < 0) {
    console.warn(`[skip sheet ${sheetName}] missing columns`, header);
    return [];
  }
  const out: {
    originCity: string;
    originState: string;
    destCity: string;
    destState: string;
    amountNative: number;
  }[] = [];
  for (let r = 1; r < matrix.length; r++) {
    const row = matrix[r] as string[];
    const o = parseLocation(row[idx.origin]);
    const d = parseLocation(row[idx.dest]);
    const amt = parseAmount(row[idx.amount]);
    if (!o || !d || amt == null) continue;
    out.push({
      originCity: o.city,
      originState: o.state,
      destCity: d.city,
      destState: d.state,
      amountNative: amt,
    });
  }
  return out;
}

function main() {
  const cadToUsd = loadEnvCadRate();
  const xlsxPath =
    process.argv[2] ||
    path.join(process.env.HOME ?? "", "Downloads", "WholeSaler_Trucker_Lists.xlsx");

  if (!existsSync(xlsxPath)) {
    console.error("File not found:", xlsxPath);
    process.exit(1);
  }

  const wb = XLSX.readFile(xlsxPath, { cellDates: true });
  const sheetNames = [
    "POSTED_LOADS_BY_BUYER",
    "POSTED_LOADS_BY_MILL",
    "POSTED_LOADS_BY_SHIPPERS",
  ];

  const all: ReturnType<typeof rowObjects> = [];
  const skippedSheets: string[] = [];
  for (const name of sheetNames) {
    if (!wb.SheetNames.includes(name)) {
      skippedSheets.push(name);
      continue;
    }
    const sh = wb.Sheets[name];
    const matrix = XLSX.utils.sheet_to_json(sh, { defval: "", header: 1 }) as unknown[][];
    all.push(...rowObjects(name, matrix));
  }

  if (skippedSheets.length) {
    console.warn("Missing sheets (skipped):", skippedSheets.join(", "));
  }

  const usedSheets = sheetNames.filter((s) => wb.SheetNames.includes(s));
  const notesBase = `Wholesaler posted-loads (${usedSheets.join(", ")}). CA–CA: CAD→USD @ ${cadToUsd}. Equipment: ${EQUIP_ANY}.`;

  const cleaned: {
    originCity: string;
    originState: string;
    destCity: string;
    destState: string;
    usd: number;
  }[] = [];
  for (const r of all) {
    const usd = toUsd(r.amountNative, r.originState, r.destState, cadToUsd);
    if (!reasonableUsd(usd)) continue;
    cleaned.push({
      originCity: r.originCity,
      originState: r.originState,
      destCity: r.destCity,
      destState: r.destState,
      usd,
    });
  }

  type CityGroup = {
    usd: number[];
    displayOrigin: string;
    displayDest: string;
    originState: string;
    destState: string;
  };

  const cityGroups = new Map<string, CityGroup>();
  for (const r of cleaned) {
    const ckO = canonicalCityKey(r.originCity);
    const ckD = canonicalCityKey(r.destCity);
    const key = `${ckO}|${r.originState}\t${ckD}|${r.destState}`;
    if (!cityGroups.has(key)) {
      cityGroups.set(key, {
        usd: [],
        displayOrigin: r.originCity,
        displayDest: r.destCity,
        originState: r.originState,
        destState: r.destState,
      });
    }
    const g = cityGroups.get(key)!;
    g.usd.push(r.usd);
  }

  const stateGroups = new Map<string, number[]>();
  for (const r of cleaned) {
    const sk = `${r.originState}\t${r.destState}`;
    if (!stateGroups.has(sk)) stateGroups.set(sk, []);
    stateGroups.get(sk)!.push(r.usd);
  }

  const benchmarks: Record<string, unknown>[] = [];

  for (const g of cityGroups.values()) {
    const n = g.usd.length;
    const avg = g.usd.reduce((a, b) => a + b, 0) / n;
    const caCa = CA_PROVINCES.has(g.originState) && CA_PROVINCES.has(g.destState);
    benchmarks.push({
      originCity: g.displayOrigin,
      destinationCity: g.displayDest,
      originState: g.originState,
      destinationState: g.destState,
      equipmentType: EQUIP_ANY,
      benchmarkAvgUsd: Math.round(avg),
      sampleCount: n,
      windowDays: 60,
      notes: `${notesBase} Static city-pair fallback (canonical grouping).${caCa ? "" : " USD amounts."}`,
    });
  }

  for (const [sk, usdList] of stateGroups) {
    const [originState, destinationState] = sk.split("\t");
    const n = usdList.length;
    const avg = usdList.reduce((a, b) => a + b, 0) / n;
    const caCa = CA_PROVINCES.has(originState) && CA_PROVINCES.has(destinationState);
    benchmarks.push({
      originState,
      destinationState,
      equipmentType: EQUIP_ANY,
      benchmarkAvgUsd: Math.round(avg),
      sampleCount: n,
      windowDays: 60,
      notes: `${notesBase} State-level static fallback.${caCa ? "" : " USD amounts."}`,
    });
  }

  benchmarks.sort((a, b) => (b.sampleCount as number) - (a.sampleCount as number));

  writeFileSync(
    path.join(root, "data", "market-benchmarks.json"),
    JSON.stringify(benchmarks, null, 2) + "\n",
    "utf-8",
  );

  console.log("Wrote market-benchmarks.json rows:", benchmarks.length);
}

main();
