import { readFileSync } from "node:fs";
import path from "node:path";

import { OfferCurrency } from "@prisma/client";
import { canonicalCityKey } from "@/lib/city-canonical";
import { equipmentShortTag } from "@/lib/lumber-equipment";
import { inferOfferCurrency } from "@/lib/lane-currency";
import { convertMoney, spreadsheetUsdEquivalentToNative } from "@/lib/money";
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
  /** When set, `benchmarkAvgUsd` is in this currency (static file rows are USD-equivalent; converted at lookup). */
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

/** Max discount from rolling average when the lane has enough samples: default 0.3 → floor at 70%. */
export function maxDiscountFraction(): number {
  const n = Number(process.env.LOB_MAX_RATE_DISCOUNT_FROM_AVG ?? "0.3");
  return Number.isFinite(n) && n >= 0 && n < 1 ? n : 0.3;
}

/** Max premium above rolling average when the lane has enough samples: default 0.3 → ceiling at 130%. */
export function maxPremiumFraction(): number {
  const n = Number(process.env.LOB_MAX_RATE_PREMIUM_FROM_AVG ?? "0.3");
  return Number.isFinite(n) && n >= 0 && n < 2 ? n : 0.3;
}

/** Wider stop-gap on thin lanes (1+ samples but below the DB trust threshold). Default 0.5 → ±50%. */
export function thinLaneBandFraction(): number {
  const n = Number(process.env.LOB_THIN_LANE_BAND_FROM_AVG ?? "0.5");
  return Number.isFinite(n) && n >= 0 && n < 2 ? n : 0.5;
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

function fileRowInOfferCurrency(row: BenchmarkRow, offerCurrency: "USD" | "CAD"): BenchmarkRow {
  const native = inferOfferCurrency(row.originState, row.destinationState);
  const nativeAmount = spreadsheetUsdEquivalentToNative(row.benchmarkAvgUsd, native);
  return {
    ...row,
    benchmarkAvgUsd: convertMoney(nativeAmount, native, offerCurrency),
    rateCurrency: offerCurrency,
  };
}

function findLaneBenchmarkFile(
  originState: string,
  destinationState: string,
  originZip: string,
  destinationZip: string,
  equipmentType: string,
  originCity?: string,
  destinationCity?: string,
  offerCurrency: "USD" | "CAD" = "CAD",
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
  if (zipHit) return { row: fileRowInOfferCurrency(zipHit, offerCurrency), matchLevel: "zip" };

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
    if (cityHit) return { row: fileRowInOfferCurrency(cityHit, offerCurrency), matchLevel: "city" };
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

export type LaneKeys = {
  originState: string;
  destinationState: string;
  originZip: string;
  destinationZip: string;
  originCity?: string;
  destinationCity?: string;
  equipmentType: string;
  offerCurrency: "USD" | "CAD";
};

export type ResolvedRateBand = {
  avg: number;
  n: number;
  matchLevel: LaneMatch["matchLevel"];
  floor: number;
  ceiling: number;
  discountFraction: number;
  premiumFraction: number;
  windowDays: number;
  currency: "USD" | "CAD";
  thinLane: boolean;
};

export function offeredAmountUsdEquivalent(amount: number, currency: "USD" | "CAD"): number {
  return convertMoney(amount, currency, "USD");
}

async function laneAverageAnySamples(args: LaneKeys): Promise<{
  avg: number;
  n: number;
  matchLevel: LaneMatch["matchLevel"];
} | null> {
  const ccy = args.offerCurrency;
  const cutoff = benchmarkCutoff();
  const oSt = normalizeState(args.originState);
  const dSt = normalizeState(args.destinationState);
  const oz = zip5ForBenchmark(args.originZip);
  const dz = zip5ForBenchmark(args.destinationZip);
  const eqNorm = normalizeEquipmentForBenchmark(args.equipmentType);
  const oc = args.originCity ? canonicalCityKey(args.originCity) : "";
  const dc = args.destinationCity ? canonicalCityKey(args.destinationCity) : "";

  const zip = await dbAggregateZip(cutoff, oSt, dSt, oz, dz, eqNorm, ccy);
  if (zip && zip.n >= 1) return { avg: zip.avg, n: zip.n, matchLevel: "zip" };
  if (oc && dc) {
    const city = await dbAggregateCity(cutoff, oSt, dSt, oc, dc, eqNorm, ccy);
    if (city && city.n >= 1) return { avg: city.avg, n: city.n, matchLevel: "city" };
  }
  const st = await dbAggregateState(cutoff, oSt, dSt, eqNorm, ccy);
  if (st && st.n >= 1) return { avg: st.avg, n: st.n, matchLevel: "state" };
  return null;
}

/**
 * Stop-gaps around the rolling lane average (zip → city → state).
 * Enough samples: ±30% (env). Thin lanes with at least one move: ±50%.
 * No DB observations: no band (Insights add-on later).
 */
export async function resolveLaneRateBand(args: LaneKeys): Promise<ResolvedRateBand | null> {
  const hit = await laneAverageAnySamples(args);
  if (!hit) return null;
  const thin = hit.n < minSamplesForDbBenchmark();
  const discount = thin ? thinLaneBandFraction() : maxDiscountFraction();
  const premium = thin ? thinLaneBandFraction() : maxPremiumFraction();
  return {
    avg: hit.avg,
    n: hit.n,
    matchLevel: hit.matchLevel,
    floor: (1 - discount) * hit.avg,
    ceiling: (1 + premium) * hit.avg,
    discountFraction: discount,
    premiumFraction: premium,
    windowDays: benchmarkWindowDays(),
    currency: args.offerCurrency,
    thinLane: thin,
  };
}

function bandRejectMessage(band: ResolvedRateBand, tooLow: boolean): string {
  const pct = Math.round((tooLow ? band.discountFraction : band.premiumFraction) * 100);
  const bound = tooLow ? band.floor : band.ceiling;
  const side = tooLow ? "low" : "high";
  const cmp = tooLow ? "at least" : "at most";
  return `Rate is too ${side} for this lane: must be ${cmp} ${tooLow ? 100 - pct : 100 + pct}% of the ${band.windowDays}-day average (≈ ${band.currency} ${bound.toFixed(0)}) based on ${band.n} comparable lumber load(s).`;
}

/** Posts and bids: cannot sit outside the lane stop-gaps when we have observations. */
export async function validateRateBand(args: LaneKeys & { amount: number }): Promise<RateBandCheck> {
  const band = await resolveLaneRateBand(args);
  if (!band) return { ok: true };
  if (args.amount < band.floor) return { ok: false, message: bandRejectMessage(band, true), thinLane: band.thinLane };
  if (args.amount > band.ceiling) return { ok: false, message: bandRejectMessage(band, false), thinLane: band.thinLane };
  return { ok: true };
}

/**
 * Posted Firm Rate / target: same stop-gaps as bids (floor and ceiling).
 */
export async function validateOfferedRateFloor(args: LaneKeys & {
  /** Native offer amount; same currency as offerCurrency (column name is legacy "Usd"). */
  offeredRate: number;
}): Promise<RateBandCheck> {
  return validateRateBand({ ...args, amount: args.offeredRate });
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
    offerCurrency: args.offerCurrency ?? "CAD",
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
        r.originCity && r.destinationCity
          ? `${r.originCity}, ${r.originState}→${r.destinationCity}, ${r.destinationState}`
          : `${r.originState}→${r.destinationState}`,
      sampleCount: r.sampleCount ?? 0,
      equipmentType: r.equipmentType,
    }));

  return [...fromDb, ...fromFile];
}
