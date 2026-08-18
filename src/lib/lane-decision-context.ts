import { canonicalCityKey } from "@/lib/city-canonical";
import type { LaneDecisionContext } from "@/lib/lane-decision-types";
import { findLaneBenchmark, resolveLaneRateBand, type LaneKeys } from "@/lib/market-rate-lane";
import { prisma } from "@/lib/prisma";
import { milesBetweenZips } from "@/lib/zip-distance";

export type { LaneDecisionContext } from "@/lib/lane-decision-types";

function laneKeysFrom(args: LaneKeys & { originCity: string; destinationCity: string }): LaneKeys {
  return {
    originState: args.originState,
    destinationState: args.destinationState,
    originZip: args.originZip,
    destinationZip: args.destinationZip,
    originCity: args.originCity,
    destinationCity: args.destinationCity,
    equipmentType: args.equipmentType,
    offerCurrency: args.offerCurrency,
  };
}

function sameCityLane(
  originCity: string,
  destinationCity: string,
  row: { originCity: string; destinationCity: string },
) {
  return (
    canonicalCityKey(row.originCity) === canonicalCityKey(originCity) &&
    canonicalCityKey(row.destinationCity) === canonicalCityKey(destinationCity)
  );
}

/**
 * Free decision context on a load (not the paid Insights add-on).
 * Market average + stop-gaps + this company's last book on the city pair.
 */
export async function getLaneDecisionContext(args: {
  originState: string;
  destinationState: string;
  originZip: string;
  destinationZip: string;
  originCity: string;
  destinationCity: string;
  equipmentType: string;
  offerCurrency: "USD" | "CAD";
  companyId: string | null;
  asShipper: boolean;
}): Promise<LaneDecisionContext> {
  const keys = laneKeysFrom(args);
  const miles = milesBetweenZips(args.originZip, args.destinationZip);
  const band = await resolveLaneRateBand(keys);

  let marketAvg = band?.avg ?? null;
  let sampleCount = band?.n ?? null;
  let matchLevel = band?.matchLevel ?? null;
  let windowDays = band?.windowDays ?? 60;

  if (marketAvg == null) {
    const bench = await findLaneBenchmark(
      args.originState,
      args.destinationState,
      args.originZip,
      args.destinationZip,
      args.equipmentType,
      args.originCity,
      args.destinationCity,
      args.offerCurrency,
    );
    if (bench) {
      marketAvg = bench.row.benchmarkAvgUsd;
      sampleCount = bench.row.sampleCount ?? null;
      matchLevel = bench.matchLevel;
      windowDays = bench.row.windowDays ?? windowDays;
    }
  }

  let lastBookedRate: number | null = null;
  let lastBookedAt: string | null = null;
  let priorLaneBookings = 0;

  if (args.companyId) {
    const rows = await prisma.booking.findMany({
      where: args.asShipper
        ? {
            load: {
              shipperCompanyId: args.companyId,
              originState: args.originState.trim().toUpperCase().slice(0, 2),
              destinationState: args.destinationState.trim().toUpperCase().slice(0, 2),
            },
          }
        : {
            carrierCompanyId: args.companyId,
            load: {
              originState: args.originState.trim().toUpperCase().slice(0, 2),
              destinationState: args.destinationState.trim().toUpperCase().slice(0, 2),
            },
          },
      orderBy: { bookedAt: "desc" },
      take: 80,
      select: {
        agreedRateUsd: true,
        bookedAt: true,
        load: { select: { originCity: true, destinationCity: true } },
      },
    });
    const onLane = rows.filter((r) => sameCityLane(args.originCity, args.destinationCity, r.load));
    priorLaneBookings = onLane.length;
    const last = onLane[0];
    if (last) {
      lastBookedRate = Number(last.agreedRateUsd);
      lastBookedAt = last.bookedAt.toISOString();
    }
  }

  return {
    currency: args.offerCurrency,
    marketAvg,
    sampleCount,
    matchLevel,
    windowDays,
    floor: band?.floor ?? null,
    ceiling: band?.ceiling ?? null,
    bandEnforced: band != null,
    thinLane: band?.thinLane ?? false,
    miles,
    lastBookedRate,
    lastBookedAt,
    priorLaneBookings,
  };
}

/** How many times this mill has booked each carrier on the same city-pair lane. */
export async function getRepeatCarrierCounts(args: {
  shipperCompanyId: string;
  originCity: string;
  destinationCity: string;
  originState: string;
  destinationState: string;
  carrierCompanyIds: string[];
}): Promise<Record<string, number>> {
  const ids = [...new Set(args.carrierCompanyIds.filter(Boolean))];
  const out: Record<string, number> = {};
  for (const id of ids) out[id] = 0;
  if (ids.length === 0) return out;

  const rows = await prisma.booking.findMany({
    where: {
      carrierCompanyId: { in: ids },
      load: {
        shipperCompanyId: args.shipperCompanyId,
        originState: args.originState.trim().toUpperCase().slice(0, 2),
        destinationState: args.destinationState.trim().toUpperCase().slice(0, 2),
      },
    },
    select: {
      carrierCompanyId: true,
      load: { select: { originCity: true, destinationCity: true } },
    },
    take: 400,
  });

  for (const r of rows) {
    if (!sameCityLane(args.originCity, args.destinationCity, r.load)) continue;
    out[r.carrierCompanyId] = (out[r.carrierCompanyId] ?? 0) + 1;
  }
  return out;
}
