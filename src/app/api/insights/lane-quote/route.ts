import { NextResponse } from "next/server";

import { findLaneBenchmark } from "@/lib/market-rate-lane";
import { prisma } from "@/lib/prisma";

/**
 * Quick price context for the supplier post-load form.
 * Returns the rolling 30-day average (or whatever LOB_BENCHMARK_WINDOW_DAYS is)
 * plus a year-over-year delta computed from `LaneRateObservation`.
 *
 * Query string (all required for a real answer):
 *   originState, originZip, originCity
 *   destinationState, destinationZip, destinationCity
 *   equipmentType
 *
 * Response shape:
 *   { match: boolean, avgUsd?: number, sampleCount?: number,
 *     matchLevel?: "zip" | "city" | "state",
 *     yoyChangePct?: number | null, prevYearAvgUsd?: number | null,
 *     windowDays?: number }
 */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const originState = (u.searchParams.get("originState") || "").trim();
  const originZip = (u.searchParams.get("originZip") || "").trim();
  const originCity = (u.searchParams.get("originCity") || "").trim();
  const destinationState = (u.searchParams.get("destinationState") || "").trim();
  const destinationZip = (u.searchParams.get("destinationZip") || "").trim();
  const destinationCity = (u.searchParams.get("destinationCity") || "").trim();
  const equipmentType = (u.searchParams.get("equipmentType") || "").trim();

  if (
    originState.length < 2 ||
    destinationState.length < 2 ||
    !originZip ||
    !destinationZip ||
    !equipmentType
  ) {
    return NextResponse.json({ match: false, reason: "incomplete" });
  }

  try {
    const hit = await findLaneBenchmark(
      originState,
      destinationState,
      originZip,
      destinationZip,
      equipmentType,
      originCity || undefined,
      destinationCity || undefined,
    );

    if (!hit) {
      return NextResponse.json({ match: false, reason: "no_benchmark" });
    }

    const oSt = originState.toUpperCase().slice(0, 2);
    const dSt = destinationState.toUpperCase().slice(0, 2);

    let yoyChangePct: number | null = null;
    let prevYearAvgUsd: number | null = null;

    try {
      const now = Date.now();
      const oneYearAgo = new Date(now - 365 * 86400000);
      const twoYearsAgo = new Date(now - 730 * 86400000);

      const prevYearRows = await prisma.$queryRaw<{ avg: number | null; n: number }[]>`
        SELECT AVG("rateUsd")::float AS avg, COUNT(*)::int AS n
        FROM "LaneRateObservation"
        WHERE "observedAt" >= ${twoYearsAgo}
          AND "observedAt" <  ${oneYearAgo}
          AND "originState" = ${oSt}
          AND "destState"   = ${dSt}
      `;
      const prev = prevYearRows[0];
      if (prev && prev.n > 0 && prev.avg && prev.avg > 0) {
        prevYearAvgUsd = prev.avg;
        yoyChangePct = ((hit.row.benchmarkAvgUsd - prev.avg) / prev.avg) * 100;
      }
    } catch {
      // Silently degrade; pricing chip stays useful even without YoY.
    }

    return NextResponse.json({
      match: true,
      avgUsd: hit.row.benchmarkAvgUsd,
      sampleCount: hit.row.sampleCount ?? null,
      matchLevel: hit.matchLevel,
      windowDays: hit.row.windowDays ?? null,
      yoyChangePct,
      prevYearAvgUsd,
    });
  } catch (e) {
    return NextResponse.json(
      { match: false, reason: "error", message: e instanceof Error ? e.message : "unknown" },
      { status: 200 },
    );
  }
}
