import { OfferCurrency } from "@prisma/client";
import { NextResponse } from "next/server";

import { inferOfferCurrency } from "@/lib/lane-currency";
import { findLaneBenchmark } from "@/lib/market-rate-lane";
import { prisma } from "@/lib/prisma";

/**
 * Quick price context for the supplier post-load form.
 * Returns the rolling average in the same currency as the offer (USD or CAD for CA–CA).
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
  const offerCurrencyParam = (u.searchParams.get("offerCurrency") || "").trim().toUpperCase();
  const offerCurrency: "USD" | "CAD" =
    offerCurrencyParam === "CAD" || offerCurrencyParam === "USD"
      ? (offerCurrencyParam as "USD" | "CAD")
      : inferOfferCurrency(originState, destinationState);

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
      offerCurrency,
    );

    if (!hit) {
      return NextResponse.json({ match: false, reason: "no_benchmark" });
    }

    const oSt = originState.toUpperCase().slice(0, 2);
    const dSt = destinationState.toUpperCase().slice(0, 2);
    const curEnum = offerCurrency === "CAD" ? "CAD" : "USD";

    let yoyChangePct: number | null = null;
    let prevYearAvg: number | null = null;

    try {
      const now = Date.now();
      const oneYearAgo = new Date(now - 365 * 86400000);
      const twoYearsAgo = new Date(now - 730 * 86400000);
      const cur: OfferCurrency = offerCurrency === "CAD" ? OfferCurrency.CAD : OfferCurrency.USD;

      const prevYearRows = await prisma.$queryRaw<{ avg: number | null; n: number }[]>`
        SELECT AVG("rateUsd")::float AS avg, COUNT(*)::int AS n
        FROM "LaneRateObservation"
        WHERE "observedAt" >= ${twoYearsAgo}
          AND "observedAt" <  ${oneYearAgo}
          AND "originState" = ${oSt}
          AND "destState"   = ${dSt}
          AND "offerCurrency" = ${cur}::"OfferCurrency"
      `;
      const prev = prevYearRows[0];
      if (prev && prev.n > 0 && prev.avg && prev.avg > 0) {
        prevYearAvg = prev.avg;
        yoyChangePct = ((hit.row.benchmarkAvgUsd - prev.avg) / prev.avg) * 100;
      }
    } catch {
      // Degrade; chip still works without YoY
    }

    return NextResponse.json({
      match: true,
      offerCurrency: curEnum,
      avgRate: hit.row.benchmarkAvgUsd,
      sampleCount: hit.row.sampleCount ?? null,
      matchLevel: hit.matchLevel,
      windowDays: hit.row.windowDays ?? null,
      yoyChangePct,
      prevYearAvg,
      // Legacy
      avgUsd: hit.row.benchmarkAvgUsd,
      prevYearAvgUsd: prevYearAvg,
    });
  } catch (e) {
    return NextResponse.json(
      { match: false, reason: "error", message: e instanceof Error ? e.message : "unknown" },
      { status: 200 },
    );
  }
}
