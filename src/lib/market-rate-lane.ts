import { readFileSync } from "node:fs";
import path from "node:path";

import { OfferCurrency } from "@prisma/client";
import { canonicalCityKey } from "@/lib/city-canonical";
import { equipmentShortTag } from "@/lib/lumber-equipment";
import { inferOfferCurrency } from "@/lib/lane-currency";
import { prisma } from "@/lib/prisma";

export type BenchmarkRow = {
  originState: string;
  destinationState: string;
  originCity?: string;
  destinationCity?: string;
  originZip?: string;
  destinationZip?: string;
  equipmentType: string;
  /**
   * Average rate in the lane, in `rateCurrency` (USD or CAD). Legacy name kept for callers.
   */
  benchmarkAvgUsd: number;
  /** When set, `benchmarkAvgUsd` is in this currency (static file rows are always USD). */
  rateCurrency?: "USD" | "CAD";
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

/**
 * Minimum posted observations in the rolling DB window before we trust DB over
 * `data/market-benchmarks.json` (wholesaler base). Also used to skip the 30% floor
 * on low-sample lanes.
 */
export function minSamplesForDbBenchmark(): number {
  const n = Number(process.env.LOB_MIN_SAMPLES_FOR_DB_BENCHMARK ?? "5");
  return Number.isFinite(n) && n >= 0 ? Math.min(Math.floor(n), 10000) : 5;
}

/** Max discount from rolling average: default 0.3 → floor at 70% of average. No ceiling. */
function maxDiscountFraction(): number {
  const n = Number(process.env.LOB_MAX_RATE_DISCOUNT_FROM_AVG ?? "0.3");
  return Number.isFinite(n) && n >= 0 && n < 1 ? n : 0.3;
}

function benchmarkCutoff(): Date {
  return new Date(Date.now() - benchmarkWindowDays() * 86400000);
}

function normalizeState(s: string): string {
  return s.trim().toUpperCase().slice(0, 2);
}

function offCurEnum(offerCurrency: "USD" | "CAD"): OfferCurrency {
  return offerCurrency === "CAD" ? OfferCurrency.CAD : OfferCurrency.USD;
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
  rateCurrency: "USD" | "CAD",
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
    rateCurrency,
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
  offerCurrency: "USD" | "CAD",
): Promise<{ avg: number; n: number } | null> {
  if (oz.length < 3 || dz.length < 3) return null;
  const c = offCurEnum(offerCurrency);
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
      AND "offerCurrency" = ${c}::"OfferCurrency"
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
  offerCurrency: "USD" | "CAD",
): Promise<{ avg: number; n: number } | null> {
  const c = offCurEnum(offerCurrency);
  const rows = await prisma.$queryRaw<{ avg: number | null; n: number }[]>`
    SELECT AVG("rateUsd")::float AS avg, COUNT(*)::int AS n
    FROM "LaneRateObservation"
    WHERE "observedAt" >= ${cutoff}
      AND "originState" = ${oSt}
      AND "destState" = ${dSt}
      AND "originCityCanon" = ${oc}
      AND "destCityCanon" = ${dc}
      AND ("equipmentNorm" = '*' OR "equipmentNorm" = ${eqNorm})
      AND "offerCurrency" = ${c}::"OfferCurrency"
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
  offerCurrency: "USD" | "CAD",
): Promise<{ avg: number; n: number } | null> {
  const c = offCurEnum(offerCurrency);
  const rows = await prisma.$queryRaw<{ avg: number | null; n: number }[]>`
    SELECT AVG("rateUsd")::float AS avg, COUNT(*)::int AS n
    FROM "LaneRateObservation"
    WHERE "observedAt" >= ${cutoff}
      AND "originState" = ${oSt}
      AND "destState" = ${dSt}
      AND ("equipmentNorm" = '*' OR "equipmentNorm" = ${eqNorm})
      AND "offerCurrency" = ${c}::"OfferCurrency"
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
  /** `market-benchmarks.json` rates are in USD. Skip for CAD posts. */
  _offerCurrency: "USD" | "CAD" = "USD",
): LaneMatch | null {
  if (_offerCurrency === "CAD") {
    return null;
  }
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
  if (zipHit) return { row: { ...zipHit, rateCurrency: "USD" }, matchLevel: "zip" };

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
    if (cityHit) return { row: { ...cityHit, rateCurrency: "USD" }, matchLevel: "city" };
  }

  // Intentionally no state/province row in the static file — range is too wide; use DB state aggregate above.

  return null;
}

/**
 * Resolves a lane price benchmark. DB observations are split by `offerCurrency`
 * so Canadian domestic averages stay in CAD, US in USD. Pass `offerCurrency` or
 * it is inferred from origin/destination (CA–CA = CAD, else USD).
 */
export async function findLaneBenchmark(
  originState: string,
  destinationState: string,
  originZip: string,
  destinationZip: string,
  equipmentType: string,
  originCity?: string,
  destinationCity?: string,
  offerCurrency?: "USD" | "CAD",
): Promise<LaneMatch | null> {
  const oSt = normalizeState(originState);
  const dSt = normalizeState(destinationState);
  const ccy = offerCurrency ?? inferOfferCurrency(originState, destinationState);
  const cutoff = benchmarkCutoff();
  const oz = zip5ForBenchmark(originZip);
  const dz = zip5ForBenchmark(destinationZip);
  const eqNorm = normalizeEquipmentForBenchmark(equipmentType);
  const oc = originCity ? canonicalCityKey(originCity) : "";
  const dc = destinationCity ? canonicalCityKey(destinationCity) : "";
  const minN = minSamplesForDbBenchmark();

  const zipDb = await dbAggregateZip(cutoff, oSt, dSt, oz, dz, eqNorm, ccy);
  if (zipDb && zipDb.n >= minN) {
    return {
      row: syntheticRow(zipDb.avg, zipDb.n, "zip", {
        originState: oSt,
        destinationState: dSt,
        originZip: oz,
        destinationZip: dz,
        equipmentType: eqNorm,
      }, ccy),
      matchLevel: "zip",
    };
  }

  if (oc && dc) {
    const cityDb = await dbAggregateCity(cutoff, oSt, dSt, oc, dc, eqNorm, ccy);
    if (cityDb && cityDb.n >= minN) {
      return {
        row: syntheticRow(cityDb.avg, cityDb.n, "city", {
          originState: oSt,
          destinationState: dSt,
          originCity: oc,
          destinationCity: dc,
          equipmentType: eqNorm,
        }, ccy),
        matchLevel: "city",
      };
    }
  }

  const stateDb = await dbAggregateState(cutoff, oSt, dSt, eqNorm, ccy);
  if (stateDb && stateDb.n >= minN) {
    return {
      row: syntheticRow(stateDb.avg, stateDb.n, "state", {
        originState: oSt,
        destinationState: dSt,
        equipmentType: eqNorm,
      }, ccy),
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
    ccy,
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

/**
 * For posts: do not go more than 30% below the rolling average for this lane
 * and currency, when the DB has at least 5 samples at zip → city → state
 * (same order as the benchmark chip). No upper limit. If fewer than 5, allow any rate.
 */
export async function validateOfferedRateFloor(args: {
  originState: string;
  destinationState: string;
  originZip: string;
  destinationZip: string;
  originCity?: string;
  destinationCity?: string;
  equipmentType: string;
  /** Native offer amount; same currency as offerCurrency (column name is legacy "Usd"). */
  offeredRate: number;
  offerCurrency: "USD" | "CAD";
}): Promise<RateBandCheck> {
  const ccy = args.offerCurrency ?? "USD";
  const cutoff = benchmarkCutoff();
  const oSt = normalizeState(args.originState);
  const dSt = normalizeState(args.destinationState);
  const oz = zip5ForBenchmark(args.originZip);
  const dz = zip5ForBenchmark(args.destinationZip);
  const eqNorm = normalizeEquipmentForBenchmark(args.equipmentType);
  const oc = args.originCity ? canonicalCityKey(args.originCity) : "";
  const dc = args.destinationCity ? canonicalCityKey(args.destinationCity) : "";
  const need = minSamplesForDbBenchmark();
  const floorMult = 1 - maxDiscountFraction();

  const zip = await dbAggregateZip(cutoff, oSt, dSt, oz, dz, eqNorm, ccy);
  if (zip && zip.n >= need) {
    const min = floorMult * zip.avg;
    if (args.offeredRate < min) {
      return {
        ok: false,
        message: `Offered rate is too low for this lane: must be at least ${Math.floor(floorMult * 100)}% of the ${benchmarkWindowDays()}-day average (≈ ${ccy} ${min.toFixed(0)}) based on ${zip.n} comparable load(s) in the same currency.`,
      };
    }
    return { ok: true };
  }
  if (oc && dc) {
    const city = await dbAggregateCity(cutoff, oSt, dSt, oc, dc, eqNorm, ccy);
    if (city && city.n >= need) {
      const min = floorMult * city.avg;
      if (args.offeredRate < min) {
        return {
          ok: false,
          message: `Offered rate is too low for this lane: must be at least ${Math.floor(floorMult * 100)}% of the ${benchmarkWindowDays()}-day average (≈ ${ccy} ${min.toFixed(0)}) based on ${city.n} comparable load(s) in the same currency.`,
        };
      }
      return { ok: true };
    }
  }
  const st = await dbAggregateState(cutoff, oSt, dSt, eqNorm, ccy);
  if (st && st.n >= need) {
    const min = floorMult * st.avg;
    if (args.offeredRate < min) {
      return {
        ok: false,
        message: `Offered rate is too low: must be at least ${Math.floor(floorMult * 100)}% of the ${benchmarkWindowDays()}-day ${oSt}→${dSt} average (≈ ${ccy} ${min.toFixed(0)}) based on ${st.n} comparable load(s) in the same currency.`,
      };
    }
    return { ok: true };
  }
  return { ok: true };
}

/** @deprecated use validateOfferedRateFloor; kept to avoid surprise during refactors. */
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
  return validateOfferedRateFloor({
    ...args,
    offerCurrency: args.offerCurrency ?? "USD",
    offeredRate: args.offeredRateUsd,
  });
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
