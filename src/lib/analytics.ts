import { Prisma } from "@prisma/client";

import marketBenchmarks from "../../data/market-benchmarks.json";
import { canonicalCityKey } from "@/lib/city-canonical";
import { prisma } from "@/lib/prisma";

type BenchmarkRow = {
  originState: string;
  destinationState: string;
  equipmentType: string;
  benchmarkAvgUsd: number;
  notes?: string;
  /** When set, the benchmark is for this specific city pair; matching bookings must use the same cities. */
  originCity?: string;
  destinationCity?: string;
  sampleCount?: number;
};

export type SpreadsheetBenchmarkViewRow = {
  originState: string;
  destinationState: string;
  equipmentType: string;
  benchmarkAvgUsd: number;
  yourBookedAvgUsd: number | null;
  bookingCount: number;
  deltaVsBenchmarkPct: number | null;
  /** What to show instead of only "AB → AB" — includes cities when the row is city-pair. */
  laneLabel: string;
  benchmarkScope: "state" | "city";
  sourceSampleCount: number | null;
  rowKey: string;
};

function equipmentMatchesBenchmark(benchEq: string, loadEq: string): boolean {
  const b = (benchEq || "*").trim().toLowerCase();
  if (b === "*" || b === "any") return true;
  return (loadEq || "").toLowerCase() === b;
}

/**
 * A spreadsheet benchmark may be state-only (all city pairs in sheet rolled to one $)
 * or a specific city pair. Bookings must match that granularity.
 */
function bookingMatchesSpreadsheetRow(
  b: BenchmarkRow,
  x: {
    load: {
      originCity: string;
      originState: string;
      destinationCity: string;
      destinationState: string;
      equipmentType: string;
    };
  },
): boolean {
  if (!equipmentMatchesBenchmark(b.equipmentType, x.load.equipmentType)) return false;
  if (x.load.originState.toUpperCase() !== b.originState.toUpperCase()) return false;
  if (x.load.destinationState.toUpperCase() !== b.destinationState.toUpperCase()) return false;
  if (b.originCity && b.destinationCity) {
    return (
      canonicalCityKey(x.load.originCity) === canonicalCityKey(b.originCity) &&
      canonicalCityKey(x.load.destinationCity) === canonicalCityKey(b.destinationCity)
    );
  }
  return true;
}

function laneLabelForBenchmark(b: BenchmarkRow): string {
  if (b.originCity && b.destinationCity) {
    return `${b.originCity} → ${b.destinationCity} · ${b.originState}–${b.destinationState}`;
  }
  return `${b.originState} → ${b.destinationState} (rebuild benchmarks — city rows only)`;
}

function rowKeyForBenchmark(b: BenchmarkRow): string {
  if (b.originCity && b.destinationCity) {
    return `c:${canonicalCityKey(b.originCity)}|${b.originState}|${canonicalCityKey(b.destinationCity)}|${b.destinationState}|${b.benchmarkAvgUsd}`;
  }
  return `s:${b.originState}|${b.destinationState}|${b.equipmentType}`;
}

function toSpreadsheetView(
  b: BenchmarkRow,
  rows: {
    yourBookedAvgUsd: number | null;
    bookingCount: number;
    deltaVsBenchmarkPct: number | null;
  },
  scope: "state" | "city",
): SpreadsheetBenchmarkViewRow {
  return {
    originState: b.originState,
    destinationState: b.destinationState,
    equipmentType: b.equipmentType,
    benchmarkAvgUsd: b.benchmarkAvgUsd,
    laneLabel: laneLabelForBenchmark(b),
    benchmarkScope: scope,
    sourceSampleCount: typeof b.sampleCount === "number" ? b.sampleCount : null,
    rowKey: rowKeyForBenchmark(b),
    ...rows,
  };
}

export type AnalyticsPeriod = "week" | "30d" | "60d" | "90d" | "yoy";

export type AnalyticsFilters = {
  period: AnalyticsPeriod;
  originCity?: string;
  originState?: string;
  destinationCity?: string;
  destinationState?: string;
  quickLane?: string;
};

type ActorScope = {
  role: string | null;
  companyId: string | null;
};

function startDateForPeriod(period: AnalyticsPeriod): Date {
  const now = new Date();
  const days =
    period === "week" ? 7 : period === "30d" ? 30 : period === "60d" ? 60 : period === "90d" ? 90 : 365;
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

function avgUsd(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Bookings-only lane stats for 30 / 60 / 90 day windows (live LOB data). */
function buildBookedLaneExplorer(
  bookings: {
    agreedRateUsd: Prisma.Decimal;
    bookedAt: Date;
    load: {
      originCity: string;
      originState: string;
      destinationCity: string;
      destinationState: string;
      equipmentType: string;
    };
  }[],
  limits: { d30: Date; d60: Date; d90: Date },
  maxRows: number,
) {
  type Bucket = { rates30: number[]; rates60: number[]; rates90: number[] };
  const map = new Map<string, Bucket & { lane: string; equipmentType: string }>();

  for (const b of bookings) {
    const lane = `${b.load.originCity}, ${b.load.originState} → ${b.load.destinationCity}, ${b.load.destinationState}`;
    const key = `${lane}||${b.load.equipmentType}`;
    const rate = Number(b.agreedRateUsd);
    if (!Number.isFinite(rate)) continue;

    let row = map.get(key);
    if (!row) {
      row = { lane, equipmentType: b.load.equipmentType, rates30: [], rates60: [], rates90: [] };
      map.set(key, row);
    }
    const t = b.bookedAt.getTime();
    if (t >= limits.d90.getTime()) row.rates90.push(rate);
    if (t >= limits.d60.getTime()) row.rates60.push(rate);
    if (t >= limits.d30.getTime()) row.rates30.push(rate);
  }

  const rows = Array.from(map.values())
    .map((r) => ({
      lane: r.lane,
      equipmentType: r.equipmentType,
      last30Days: {
        bookingCount: r.rates30.length,
        averageAgreedRateUsd: avgUsd(r.rates30),
      },
      last60Days: {
        bookingCount: r.rates60.length,
        averageAgreedRateUsd: avgUsd(r.rates60),
      },
      last90Days: {
        bookingCount: r.rates90.length,
        averageAgreedRateUsd: avgUsd(r.rates90),
      },
    }))
    .sort((a, b) => b.last90Days.bookingCount - a.last90Days.bookingCount)
    .slice(0, maxRows);

  return rows;
}

function parseQuickLane(quickLane?: string) {
  if (!quickLane) return {};
  const m = quickLane.match(/^(.+),\s*([A-Z]{2})\s*->\s*(.+),\s*([A-Z]{2})$/i);
  if (!m) return {};
  return {
    originCity: m[1].trim(),
    originState: m[2].toUpperCase(),
    destinationCity: m[3].trim(),
    destinationState: m[4].toUpperCase(),
  };
}

function normalize(str?: string) {
  return str?.trim();
}

function bucketLabel(date: Date, period: AnalyticsPeriod): string {
  if (period === "week" || period === "30d") {
    return date.toISOString().slice(0, 10);
  }
  const d = new Date(date);
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + (1 - day));
  return d.toISOString().slice(0, 10);
}

export async function getLaneQuickOptions(limit = 50): Promise<string[]> {
  const lanes = await prisma.load.findMany({
    distinct: ["originCity", "originState", "destinationCity", "destinationState"],
    select: {
      originCity: true,
      originState: true,
      destinationCity: true,
      destinationState: true,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return lanes.map(
    (l) => `${l.originCity}, ${l.originState.toUpperCase()} -> ${l.destinationCity}, ${l.destinationState.toUpperCase()}`,
  );
}

export async function getAnalyticsOverview(scope: ActorScope, filters: AnalyticsFilters) {
  const quick = parseQuickLane(filters.quickLane);
  const originCity = normalize(filters.originCity ?? quick.originCity);
  const originState = normalize(filters.originState ?? quick.originState)?.toUpperCase();
  const destinationCity = normalize(filters.destinationCity ?? quick.destinationCity);
  const destinationState = normalize(filters.destinationState ?? quick.destinationState)?.toUpperCase();
  const periodStart = startDateForPeriod(filters.period);
  const prevPeriodStart = new Date(periodStart);
  prevPeriodStart.setFullYear(prevPeriodStart.getFullYear() - 1);
  const now = new Date();
  const prevPeriodEnd = new Date(now);
  prevPeriodEnd.setFullYear(prevPeriodEnd.getFullYear() - 1);

  const loadWhere: Prisma.LoadWhereInput = {
    createdAt: { gte: periodStart },
    ...(originCity ? { originCity: { equals: originCity, mode: "insensitive" } } : {}),
    ...(originState ? { originState: originState } : {}),
    ...(destinationCity ? { destinationCity: { equals: destinationCity, mode: "insensitive" } } : {}),
    ...(destinationState ? { destinationState: destinationState } : {}),
  };

  if (scope.role === "SHIPPER" && scope.companyId) {
    loadWhere.shipperCompanyId = scope.companyId;
  }

  const bookingLoadWhere: Prisma.LoadWhereInput = {
    ...(originCity ? { originCity: { equals: originCity, mode: "insensitive" } } : {}),
    ...(originState ? { originState: originState } : {}),
    ...(destinationCity ? { destinationCity: { equals: destinationCity, mode: "insensitive" } } : {}),
    ...(destinationState ? { destinationState: destinationState } : {}),
  };

  const bookingWhere: Prisma.BookingWhereInput = {
    bookedAt: { gte: periodStart },
    load: { is: bookingLoadWhere },
  };

  if (scope.role === "DISPATCHER" && scope.companyId) {
    bookingWhere.carrierCompanyId = scope.companyId;
  }
  if (scope.role === "SHIPPER" && scope.companyId) {
    bookingLoadWhere.shipperCompanyId = scope.companyId;
  }

  const explorerBookingWhere: Prisma.BookingWhereInput = {
    bookedAt: { gte: startDateForPeriod("90d") },
    load: { is: bookingLoadWhere },
    ...(scope.role === "DISPATCHER" && scope.companyId ? { carrierCompanyId: scope.companyId } : {}),
  };

  const prevBookingWhere: Prisma.BookingWhereInput = {
    ...bookingWhere,
    bookedAt: { gte: prevPeriodStart, lte: prevPeriodEnd },
  };
  const prevLoadWhere: Prisma.LoadWhereInput = {
    ...loadWhere,
    createdAt: { gte: prevPeriodStart, lte: prevPeriodEnd },
  };

  const [loads, bookings, prevLoads, prevBookings, explorerBookings] = await Promise.all([
    prisma.load.findMany({
      where: loadWhere,
      select: {
        id: true,
        status: true,
        weightLbs: true,
        equipmentType: true,
        originCity: true,
        originState: true,
        destinationCity: true,
        destinationState: true,
        createdAt: true,
        offeredRateUsd: true,
      },
    }),
    prisma.booking.findMany({
      where: bookingWhere,
      select: {
        agreedRateUsd: true,
        bookedAt: true,
        load: {
          select: {
            equipmentType: true,
            originCity: true,
            originState: true,
            destinationCity: true,
            destinationState: true,
          },
        },
      },
    }),
    prisma.load.findMany({
      where: prevLoadWhere,
      select: { id: true },
    }),
    prisma.booking.findMany({
      where: prevBookingWhere,
      select: { agreedRateUsd: true },
    }),
    prisma.booking.findMany({
      where: explorerBookingWhere,
      select: {
        agreedRateUsd: true,
        bookedAt: true,
        load: {
          select: {
            equipmentType: true,
            originCity: true,
            originState: true,
            destinationCity: true,
            destinationState: true,
          },
        },
      },
    }),
  ]);

  const bookedLaneExplorer = buildBookedLaneExplorer(explorerBookings, {
    d30: startDateForPeriod("30d"),
    d60: startDateForPeriod("60d"),
    d90: startDateForPeriod("90d"),
  }, 50);

  const avgRate =
    bookings.length === 0
      ? 0
      : bookings.reduce((acc, b) => acc + Number(b.agreedRateUsd), 0) / bookings.length;
  const prevAvgRate =
    prevBookings.length === 0
      ? 0
      : prevBookings.reduce((acc, b) => acc + Number(b.agreedRateUsd), 0) / prevBookings.length;

  const deliveredCount = loads.filter((l) => l.status === "DELIVERED").length;
  const totalWeight = loads.reduce((acc, l) => acc + l.weightLbs, 0);
  const daysWindow = Math.max(1, Math.round((now.getTime() - periodStart.getTime()) / (24 * 60 * 60 * 1000)));
  const bookingsPerWeek = (bookings.length / daysWindow) * 7;

  const trendMap = new Map<string, { bookings: number; avgRateAccumulator: number }>();
  for (const b of bookings) {
    const key = bucketLabel(b.bookedAt, filters.period);
    const current = trendMap.get(key) ?? { bookings: 0, avgRateAccumulator: 0 };
    current.bookings += 1;
    current.avgRateAccumulator += Number(b.agreedRateUsd);
    trendMap.set(key, current);
  }
  const trends = Array.from(trendMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([bucket, value]) => ({
      bucket,
      bookings: value.bookings,
      averageRate: value.bookings > 0 ? value.avgRateAccumulator / value.bookings : 0,
    }));

  const equipmentMap = new Map<string, number>();
  for (const b of bookings) {
    const type = b.load.equipmentType || "Unknown";
    equipmentMap.set(type, (equipmentMap.get(type) ?? 0) + 1);
  }
  const equipmentMix = Array.from(equipmentMap.entries())
    .map(([equipmentType, count]) => ({
      equipmentType,
      count,
      sharePct: bookings.length > 0 ? (count / bookings.length) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  const originMap = new Map<string, number>();
  const destinationMap = new Map<string, number>();
  for (const l of loads) {
    const o = `${l.originCity}, ${l.originState}`;
    const d = `${l.destinationCity}, ${l.destinationState}`;
    originMap.set(o, (originMap.get(o) ?? 0) + 1);
    destinationMap.set(d, (destinationMap.get(d) ?? 0) + 1);
  }

  const preferredOrigins = Array.from(originMap.entries())
    .map(([lane, count]) => ({ lane, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
  const preferredDestinations = Array.from(destinationMap.entries())
    .map(([lane, count]) => ({ lane, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const statePairLoads = new Map<string, number>();
  const statePairBookings = new Map<string, number>();
  for (const l of loads) {
    const k = `${l.originState}-${l.destinationState}`;
    statePairLoads.set(k, (statePairLoads.get(k) ?? 0) + 1);
  }
  for (const b of bookings) {
    const k = `${b.load.originState}-${b.load.destinationState}`;
    statePairBookings.set(k, (statePairBookings.get(k) ?? 0) + 1);
  }
  const stateKeys = new Set([...statePairLoads.keys(), ...statePairBookings.keys()]);
  const lanesByStatePair = Array.from(stateKeys)
    .map((statePair) => ({
      statePair,
      loadsPosted: statePairLoads.get(statePair) ?? 0,
      bookings: statePairBookings.get(statePair) ?? 0,
    }))
    .sort((a, b) => b.loadsPosted + b.bookings - (a.loadsPosted + a.bookings))
    .slice(0, 20);

  const cityLaneLoads = new Map<string, number>();
  const cityLaneBookings = new Map<string, number>();
  for (const l of loads) {
    const k = `${l.originCity}, ${l.originState} → ${l.destinationCity}, ${l.destinationState}`;
    cityLaneLoads.set(k, (cityLaneLoads.get(k) ?? 0) + 1);
  }
  for (const b of bookings) {
    const k = `${b.load.originCity}, ${b.load.originState} → ${b.load.destinationCity}, ${b.load.destinationState}`;
    cityLaneBookings.set(k, (cityLaneBookings.get(k) ?? 0) + 1);
  }
  const cityKeys = new Set([...cityLaneLoads.keys(), ...cityLaneBookings.keys()]);
  const lanesByCityPair = Array.from(cityKeys)
    .map((lane) => ({
      lane,
      loadsPosted: cityLaneLoads.get(lane) ?? 0,
      bookings: cityLaneBookings.get(lane) ?? 0,
    }))
    .sort((a, b) => b.loadsPosted + b.bookings - (a.loadsPosted + a.bookings))
    .slice(0, 20);

  const equipmentPosted = new Map<string, number>();
  for (const l of loads) {
    const t = l.equipmentType || "Unknown";
    equipmentPosted.set(t, (equipmentPosted.get(t) ?? 0) + 1);
  }
  const equipmentPostedMix = Array.from(equipmentPosted.entries())
    .map(([equipmentType, count]) => ({
      equipmentType,
      count,
      sharePct: loads.length > 0 ? (count / loads.length) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  const benchmarks = marketBenchmarks as BenchmarkRow[];

  function mapSpreadsheetList(list: BenchmarkRow[], scope: "state" | "city"): SpreadsheetBenchmarkViewRow[] {
    const out = list.map((b) => {
      const matching = bookings.filter((x) => bookingMatchesSpreadsheetRow(b, x));
      const yourAvg =
        matching.length === 0
          ? null
          : matching.reduce((s, x) => s + Number(x.agreedRateUsd), 0) / matching.length;
      return toSpreadsheetView(
        b,
        {
          yourBookedAvgUsd: yourAvg,
          bookingCount: matching.length,
          deltaVsBenchmarkPct:
            yourAvg == null ? null : ((yourAvg - b.benchmarkAvgUsd) / b.benchmarkAvgUsd) * 100,
        },
        scope,
      );
    });
    out.sort((a, b) => (b.sourceSampleCount ?? 0) - (a.sourceSampleCount ?? 0));
    return out;
  }

  // Static file is city-pair only (no state/province aggregates). Ignore any legacy state-only rows.
  const cityBenchmarkRows = benchmarks.filter((b) => Boolean(b.originCity && b.destinationCity));

  const spreadsheetBenchmarks = {
    cityLevel: mapSpreadsheetList(cityBenchmarkRows, "city"),
  };

  return {
    filtersApplied: {
      period: filters.period,
      originCity,
      originState,
      destinationCity,
      destinationState,
      quickLane: filters.quickLane ?? "",
    },
    pricing: {
      averageRateUsd: avgRate,
      previousYearAverageRateUsd: prevAvgRate,
      yoyRateChangePct: prevAvgRate === 0 ? null : ((avgRate - prevAvgRate) / prevAvgRate) * 100,
    },
    volume: {
      loadsPosted: loads.length,
      loadsDelivered: deliveredCount,
      bookings: bookings.length,
      totalWeightLbs: totalWeight,
    },
    frequency: {
      bookings,
      bookingsPerWeek,
      previousYearBookings: prevBookings.length,
      yoyBookingChangePct:
        prevBookings.length === 0 ? null : ((bookings.length - prevBookings.length) / prevBookings.length) * 100,
    },
    equipmentMix,
    trends,
    shipperPreferences: {
      preferredOrigins,
      preferredDestinations,
    },
    yoy: {
      currentLoads: loads.length,
      previousYearLoads: prevLoads.length,
      currentBookings: bookings.length,
      previousYearBookings: prevBookings.length,
      loadsChangePct: prevLoads.length === 0 ? null : ((loads.length - prevLoads.length) / prevLoads.length) * 100,
    },
    lanes: {
      byStatePair: lanesByStatePair,
      byCityPair: lanesByCityPair,
    },
    equipmentPostedMix,
    spreadsheetBenchmarks,
    /** Avg agreed rate on booked loads only; 30/60/90 are separate windows (not nested). */
    bookedLaneExplorer,
  };
}

