import { readFileSync } from "node:fs";
import path from "node:path";

import { equipmentShortTag } from "@/lib/lumber-equipment";

export type BenchmarkRow = {
  originState: string;
  destinationState: string;
  originZip?: string;
  destinationZip?: string;
  equipmentType: string;
  benchmarkAvgUsd: number;
  /** Observed loads in the 60-day window; <5 triggers wider band (50%). */
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

function normalizeState(s: string): string {
  return s.trim().toUpperCase().slice(0, 2);
}

function normalizeEquipment(eq: string): string {
  return equipmentShortTag(eq);
}

export type LaneMatch = {
  row: BenchmarkRow;
  matchLevel: "zip" | "state";
};

export function findLaneBenchmark(
  originState: string,
  destinationState: string,
  originZip: string,
  destinationZip: string,
  equipmentType: string,
): LaneMatch | null {
  const oSt = normalizeState(originState);
  const dSt = normalizeState(destinationState);
  const oZip = originZip.replace(/\D/g, "").slice(0, 5);
  const dZip = destinationZip.replace(/\D/g, "").slice(0, 5);
  const eq = normalizeEquipment(equipmentType);
  const rows = loadBenchmarks();

  const zipHit = rows.find(
    (r) =>
      r.originZip &&
      r.destinationZip &&
      r.originZip.replace(/\D/g, "").slice(0, 5) === oZip &&
      r.destinationZip.replace(/\D/g, "").slice(0, 5) === dZip &&
      normalizeEquipment(r.equipmentType) === eq,
  );
  if (zipHit) return { row: zipHit, matchLevel: "zip" };

  const stateHit = rows.find(
    (r) =>
      normalizeState(r.originState) === oSt &&
      normalizeState(r.destinationState) === dSt &&
      normalizeEquipment(r.equipmentType) === eq,
  );
  if (stateHit) return { row: stateHit, matchLevel: "state" };

  return null;
}

export type RateBandCheck =
  | { ok: true }
  | { ok: false; message: string; thinLane?: boolean };

/**
 * ±30% vs 60d average when sampleCount >= 5 (default).
 * ±50% when sampleCount < 5 but lane exists.
 * No lane: optional env LOB_DEFAULT_MIN_RATE_USD / LOB_DEFAULT_MAX_RATE_USD else allow with warning-only (wide band).
 */
export function validateOfferedRateAgainstBenchmark(args: {
  originState: string;
  destinationState: string;
  originZip: string;
  destinationZip: string;
  equipmentType: string;
  offeredRateUsd: number;
}): RateBandCheck {
  const hit = findLaneBenchmark(
    args.originState,
    args.destinationState,
    args.originZip,
    args.destinationZip,
    args.equipmentType,
  );

  const minDefault = Number(process.env.LOB_DEFAULT_MIN_RATE_USD ?? "300");
  const maxDefault = Number(process.env.LOB_DEFAULT_MAX_RATE_USD ?? "50000");

  if (!hit) {
    const min = Number.isFinite(minDefault) ? minDefault : 300;
    const max = Number.isFinite(maxDefault) ? maxDefault : 50000;
    if (args.offeredRateUsd >= min && args.offeredRateUsd <= max) {
      return { ok: true };
    }
    return {
      ok: false,
      message: `No 60-day benchmark for this lane/equipment yet. Allowed fallback range is $${min}–$${max} (set LOB_DEFAULT_MIN_RATE_USD / LOB_DEFAULT_MAX_RATE_USD or add data/market-benchmarks.json). Offered: $${args.offeredRateUsd}.`,
    };
  }

  const avg = hit.row.benchmarkAvgUsd;
  const n = hit.row.sampleCount ?? 10;
  const lowPct = n >= 5 ? 0.7 : 0.5;
  const highPct = n >= 5 ? 1.3 : 1.5;
  const min = avg * lowPct;
  const max = avg * highPct;

  if (args.offeredRateUsd < min || args.offeredRateUsd > max) {
    return {
      ok: false,
      thinLane: n < 5,
      message: `Rate must stay within ${Math.round(lowPct * 100)}–${Math.round(highPct * 100)}% of the ${n >= 5 ? "60-day" : "benchmark"} average ($${avg.toLocaleString()}${n < 5 ? `, only ${n} sample(s)` : ""}). Allowed: $${Math.ceil(min)}–$${Math.floor(max)}.`,
    };
  }

  return { ok: true };
}

export function listThinLanes(): { lane: string; sampleCount: number; equipmentType: string }[] {
  const rows = loadBenchmarks();
  return rows
    .filter((r) => (r.sampleCount ?? 0) > 0 && (r.sampleCount ?? 0) < 5)
    .map((r) => ({
      lane: r.originZip && r.destinationZip ? `${r.originZip}→${r.destinationZip}` : `${r.originState}→${r.destinationState}`,
      sampleCount: r.sampleCount ?? 0,
      equipmentType: r.equipmentType,
    }));
}
