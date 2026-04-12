import { readFileSync } from "node:fs";
import path from "node:path";

import { canonicalCityKey } from "@/lib/city-canonical";
import { equipmentShortTag } from "@/lib/lumber-equipment";
import { prisma } from "@/lib/prisma";

export type BenchmarkRow = {
  originState: string;
  destinationState: string;
  originCity?: string;
  destinationCity?: string;
  originZip?: string;
  destinationZip?: string;
  equipmentType: string;
  benchmarkAvgUsd: number;
  sampleCount?: number;
  windowDays?: number;
  notes?: string;
};

let cached: BenchmarkRow[] | null = null;

function loadBenchmarks(): BenchmarkRow[] {
  if (cached) return cached;
  const p = path.join(process.cwd(), "data", "market-benchmarks.json");
  const raw = readFileSync(p, "utf-8");
  cached = JSON.parse(raw) as BenchmarkRow[];
  return cached;
}

export function benchmarkWindowDays(): number {
  const n = Number(process.env.LOB_BENCHMARK_WINDOW_DAYS ?? "60");
  return Number.isFinite(n) && n > 0 ? Math.min(n, 365) : 60;
}

function benchmarkCutoff(): Date {
  return new Date(Date.now() - benchmarkWindowDays() * 86400000);
}

function normalizeState(s: string): string {
  return s.trim().toUpperCase().slice(0, 2);
}

export function normalizeEquipmentForBenchmark(eq: string): string {
  return equipmentShortTag(eq);
}

function rowMatchesEquipment(r: BenchmarkRow, equipmentType: string): boolean {
  if (r.equipmentType === "*" || r.equipmentType === "ANY") return true;
  return normalizeEquipmentForBenchmark(r.equipmentType) === normalizeEquipmentForBenchmark(equipmentType);
}

/** First 5 alphanumeric chars of postal/ZIP for observation matching. */
export function zip5ForBenchmark(zip: string): string {
  return zip.replace(/\W/g, "").toUpperCase().slice(0, 5);
}

function normalizeCityForFileMatch(c: string): string {
  return canonicalCityKey(c);
}

export type LaneMatch = {
  row: BenchmarkRow;
  matchLevel: "zip" | "city" | "state";
};

function syntheticRow(
  avg: number,
  n: number,
  matchLevel: LaneMatch["matchLevel"],
  partial: Partial<BenchmarkRow>,
): BenchmarkRow {
  return {
    originState: partial.originState ?? "",
    destinationState: partial.destinationState ?? "",
    originCity: partial.originCity,
    destinationCity: partial.destinationCity,
    originZip: partial.originZip,
    destinationZip: partial.destinationZip,
    equipmentType: partial.equipmentType ?? "*",
    benchmarkAvgUsd: Math.round(avg),
    sampleCount: n,
    windowDays: benchmarkWindowDays(),
    notes: `Rolling ${benchmarkWindowDays()}d average from ${n} posted rate(s) in LOB (APP + spreadsheet import).`,
  };
}

async function dbAggregateZip(
  cutoff: Date,
  oSt: string,
  dSt: string,
  oz: string,
  dz: string,
  eqNorm: string,
): Promise<{ avg: number; n: number } | null> {
  if (oz.length < 3 || dz.length < 3) return null;
  const rows = await prisma.$queryRaw<{ avg: number | null; n: number }[]>`
    SELECT AVG("rateUsd")::float AS avg, COUNT(*)::int AS n
    FROM "LaneRateObservation"
    WHERE "observedAt" >= ${cutoff}
      AND "originState" = ${oSt}
      AND "destState" = ${dSt}
      AND "originZip5" = ${oz}
      AND "destZip5" = ${dz}
      AND "originZip5" != ''
      AND "destZip5" != ''
      AND ("equipmentNorm" = '*' OR "equipmentNorm" = ${eqNorm})
  `;
  const r = rows[0];
  if (!r || r.n === 0 || r.avg == null) return null;
  return { avg: r.avg, n: r.n };
}

async function dbAggregateCity(
  cutoff: Date,
  oSt: string,
  dSt: string,
  oc: string,
  dc: string,
  eqNorm: string,
): Promise<{ avg: number; n: number } | null> {
  const rows = await prisma.$queryRaw<{ avg: number | null; n: number }[]>`
    SELECT AVG("rateUsd")::float AS avg, COUNT(*)::int AS n
    FROM "LaneRateObservation"
    WHERE "observedAt" >= ${cutoff}
      AND "originState" = ${oSt}
      AND "destState" = ${dSt}
      AND "originCityCanon" = ${oc}
      AND "destCityCanon" = ${dc}
      AND ("equipmentNorm" = '*' OR "equipmentNorm" = ${eqNorm})
  `;
  const r = rows[0];
  if (!r || r.n === 0 || r.avg == null) return null;
  return { avg: r.avg, n: r.n };
}

async function dbAggregateState(
  cutoff: Date,
  oSt: string,
  dSt: string,
  eqNorm: string,
): Promise<{ avg: number; n: number } | null> {
  const rows = await prisma.$queryRaw<{ avg: number | null; n: number }[]>`
    SELECT AVG("rateUsd")::float AS avg, COUNT(*)::int AS n
    FROM "LaneRateObservation"
    WHERE "observedAt" >= ${cutoff}
      AND "originState" = ${oSt}
      AND "destState" = ${dSt}
      AND ("equipmentNorm" = '*' OR "equipmentNorm" = ${eqNorm})
  `;
  const r = rows[0];
  if (!r || r.n === 0 || r.avg == null) return null;
  return { avg: r.avg, n: r.n };
}

function findLaneBenchmarkFile(
  originState: string,
  destinationState: string,
  originZip: string,
  destinationZip: string,
  equipmentType: string,
  originCity?: string,
  destinationCity?: string,
): LaneMatch | null {
  const oSt = normalizeState(originState);
  const dSt = normalizeState(destinationState);
  const oZip = originZip.replace(/\D/g, "").slice(0, 5);
  const dZip = destinationZip.replace(/\D/g, "").slice(0, 5);
  const rows = loadBenchmarks();

  const zipHit = rows.find(
    (r) =>
      r.originZip &&
      r.destinationZip &&
      r.originZip.replace(/\D/g, "").slice(0, 5) === oZip &&
      r.destinationZip.replace(/\D/g, "").slice(0, 5) === dZip &&
      rowMatchesEquipment(r, equipmentType),
  );
  if (zipHit) return { row: zipHit, matchLevel: "zip" };

  const oc = originCity ? normalizeCityForFileMatch(originCity) : "";
  const dc = destinationCity ? normalizeCityForFileMatch(destinationCity) : "";
  if (oc && dc) {
    const cityHit = rows.find(
      (r) =>
        r.originCity &&
        r.destinationCity &&
        normalizeCityForFileMatch(r.originCity) === oc &&
        normalizeCityForFileMatch(r.destinationCity) === dc &&
        normalizeState(r.originState) === oSt &&
        normalizeState(r.destinationState) === dSt &&
        rowMatchesEquipment(r, equipmentType),
    );
    if (cityHit) return { row: cityHit, matchLevel: "city" };
  }

  const stateHit = rows.find(
    (r) =>
      !r.originCity &&
      !r.destinationCity &&
      normalizeState(r.originState) === oSt &&
      normalizeState(r.destinationState) === dSt &&
      rowMatchesEquipment(r, equipmentType),
  );
  if (stateHit) return { row: stateHit, matchLevel: "state" };

  return null;
}

export async function findLaneBenchmark(
  originState: string,
  destinationState: string,
  originZip: string,
  destinationZip: string,
  equipmentType: string,
  originCity?: string,
  destinationCity?: string,
): Promise<LaneMatch | null> {
  const cutoff = benchmarkCutoff();
  const oSt = normalizeState(originState);
  const dSt = normalizeState(destinationState);
  const oz = zip5ForBenchmark(originZip);
  const dz = zip5ForBenchmark(destinationZip);
  const eqNorm = normalizeEquipmentForBenchmark(equipmentType);
  const oc = originCity ? canonicalCityKey(originCity) : "";
  const dc = destinationCity ? canonicalCityKey(destinationCity) : "";

  const zipDb = await dbAggregateZip(cutoff, oSt, dSt, oz, dz, eqNorm);
  if (zipDb) {
    return {
      row: syntheticRow(zipDb.avg, zipDb.n, "zip", {
        originState: oSt,
        destinationState: dSt,
        originZip: oz,
        destinationZip: dz,
        equipmentType: eqNorm,
      }),
      matchLevel: "zip",
    };
  }

  if (oc && dc) {
    const cityDb = await dbAggregateCity(cutoff, oSt, dSt, oc, dc, eqNorm);
    if (cityDb) {
      return {
        row: syntheticRow(cityDb.avg, cityDb.n, "city", {
          originState: oSt,
          destinationState: dSt,
          originCity: oc,
          destinationCity: dc,
          equipmentType: eqNorm,
        }),
        matchLevel: "city",
      };
    }
  }

  const stateDb = await dbAggregateState(cutoff, oSt, dSt, eqNorm);
  if (stateDb) {
    return {
      row: syntheticRow(stateDb.avg, stateDb.n, "state", {
        originState: oSt,
        destinationState: dSt,
        equipmentType: eqNorm,
      }),
      matchLevel: "state",
    };
  }

  return findLaneBenchmarkFile(
    originState,
    destinationState,
    originZip,
    destinationZip,
    equipmentType,
    originCity,
    destinationCity,
  );
}

export type RateBandCheck =
  | { ok: true }
  | { ok: false; message: string; thinLane?: boolean };

export function offeredAmountUsdEquivalent(amount: number, currency: "USD" | "CAD"): number {
  if (currency === "USD") return amount;
  const cadToUsd = Number(process.env.LOB_CAD_TO_USD_RATE ?? "0.73");
  const mult = Number.isFinite(cadToUsd) ? cadToUsd : 0.73;
  return amount * mult;
}

export async function validateOfferedRateAgainstBenchmark(args: {
  originState: string;
  destinationState: string;
  originZip: string;
  destinationZip: string;
  originCity?: string;
  destinationCity?: string;
  equipmentType: string;
  offeredRateUsd: number;
  offerCurrency?: "USD" | "CAD";
}): Promise<RateBandCheck> {
  const currency = args.offerCurrency ?? "USD";
  const offeredUsdEq = offeredAmountUsdEquivalent(args.offeredRateUsd, currency);

  const hit = await findLaneBenchmark(
    args.originState,
    args.destinationState,
    args.originZip,
    args.destinationZip,
    args.equipmentType,
    args.originCity,
    args.destinationCity,
  );

  const minDefault = Number(process.env.LOB_DEFAULT_MIN_RATE_USD ?? "300");
  const maxDefault = Number(process.env.LOB_DEFAULT_MAX_RATE_USD ?? "50000");

  if (!hit) {
    const min = Number.isFinite(minDefault) ? minDefault : 300;
    const max = Number.isFinite(maxDefault) ? maxDefault : 50000;
    if (offeredUsdEq >= min && offeredUsdEq <= max) {
      return { ok: true };
    }
    return {
      ok: false,
      message: `No ${benchmarkWindowDays()}-day benchmark for this lane/equipment yet. Allowed fallback range is ~$${min}–$${max} USD equivalent (set LOB_DEFAULT_MIN_RATE_USD / LOB_DEFAULT_MAX_RATE_USD or add observations / data/market-benchmarks.json). Offered: ${currency} ${args.offeredRateUsd}.`,
    };
  }

  const avg = hit.row.benchmarkAvgUsd;
  const n = hit.row.sampleCount ?? 10;
  const lowPct = n >= 5 ? 0.7 : 0.5;
  const highPct = n >= 5 ? 1.3 : 1.5;
  const min = avg * lowPct;
  const max = avg * highPct;

  if (offeredUsdEq < min || offeredUsdEq > max) {
    return {
      ok: false,
      thinLane: n < 5,
      message: `Rate must stay within ${Math.round(lowPct * 100)}–${Math.round(highPct * 100)}% of the ${n >= 5 ? `${benchmarkWindowDays()}-day` : "benchmark"} average (USD ${avg.toLocaleString()}${n < 5 ? `, only ${n} sample(s)` : ""}). ${currency === "CAD" ? `Checked using USD equivalent of your CAD rate (LOB_CAD_TO_USD_RATE). ` : ""}Allowed USD equivalent: $${Math.ceil(min)}–$${Math.floor(max)}.`,
    };
  }

  return { ok: true };
}

export async function listThinLanes(): Promise<{ lane: string; sampleCount: number; equipmentType: string }[]> {
  const cutoff = benchmarkCutoff();
  const dbRows = await prisma.$queryRaw<
    {
      originState: string;
      destState: string;
      originCityCanon: string;
      destCityCanon: string;
      equipmentNorm: string;
      n: number;
    }[]
  >`
    SELECT "originState", "destState", "originCityCanon", "destCityCanon", "equipmentNorm",
           COUNT(*)::int AS n
    FROM "LaneRateObservation"
    WHERE "observedAt" >= ${cutoff}
    GROUP BY "originState", "destState", "originCityCanon", "destCityCanon", "equipmentNorm"
    HAVING COUNT(*) >= 1 AND COUNT(*) < 5
  `;

  const fromDb = dbRows.map((r) => ({
    lane:
      r.originCityCanon && r.destCityCanon
        ? `${r.originCityCanon}, ${r.originState}→${r.destCityCanon}, ${r.destState}`
        : `${r.originState}→${r.destState}`,
    sampleCount: r.n,
    equipmentType: r.equipmentNorm,
  }));

  const fromFile = loadBenchmarks()
    .filter((r) => (r.sampleCount ?? 0) > 0 && (r.sampleCount ?? 0) < 5)
    .map((r) => ({
      lane:
        r.originZip && r.destinationZip
          ? `${r.originZip}→${r.destinationZip}`
          : r.originCity && r.destinationCity
            ? `${r.originCity}, ${r.originState}→${r.destinationCity}, ${r.destinationState}`
            : `${r.originState}→${r.destinationState}`,
      sampleCount: r.sampleCount ?? 0,
      equipmentType: r.equipmentType,
    }));

  return [...fromDb, ...fromFile];
}

