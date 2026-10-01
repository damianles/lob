import { prisma } from "@/lib/prisma";
import { listThinLanes } from "@/lib/market-rate-lane";

export type MarketplaceIntelSnapshot = {
  generatedAt: string;
  periodDays: number;
  totals: {
    loadsPosted: number;
    bookings: number;
    activeShippers: number;
    activeCarriers: number;
    observationRows: number;
  };
  topCityLanes: { lane: string; posts: number; bookings: number }[];
  topStatePairs: { statePair: string; posts: number; bookings: number }[];
  topShippersByPosts: { companyId: string; legalName: string; posts: number; phone: string | null }[];
  topCarriersByBooks: { companyId: string; legalName: string; bookings: number; phone: string | null }[];
  thinLanes: Awaited<ReturnType<typeof listThinLanes>>;
};

/**
 * Platform-wide lane + usage snapshot for LOB ops (customer targeting).
 * Does not expose company identities to marketplace customers — admin/CLI only.
 */
export async function getMarketplaceIntelSnapshot(periodDays = 90): Promise<MarketplaceIntelSnapshot> {
  const since = new Date(Date.now() - periodDays * 86400000);

  const [loads, bookings, observationRows, thinLanes] = await Promise.all([
    prisma.load.findMany({
      where: { createdAt: { gte: since } },
      select: {
        id: true,
        shipperCompanyId: true,
        originCity: true,
        originState: true,
        destinationCity: true,
        destinationState: true,
        shipperCompany: { select: { id: true, legalName: true, businessPhone: true } },
      },
    }),
    prisma.booking.findMany({
      where: { bookedAt: { gte: since } },
      select: {
        id: true,
        carrierCompanyId: true,
        load: {
          select: {
            originCity: true,
            originState: true,
            destinationCity: true,
            destinationState: true,
          },
        },
        carrierCompany: { select: { id: true, legalName: true, businessPhone: true } },
      },
    }),
    prisma.laneRateObservation.count({ where: { observedAt: { gte: since } } }),
    listThinLanes(),
  ]);

  const cityPosts = new Map<string, number>();
  const cityBooks = new Map<string, number>();
  const statePosts = new Map<string, number>();
  const stateBooks = new Map<string, number>();
  const shipperPosts = new Map<string, { legalName: string; phone: string | null; posts: number }>();
  const carrierBooks = new Map<string, { legalName: string; phone: string | null; bookings: number }>();

  for (const l of loads) {
    const city = `${l.originCity}, ${l.originState} → ${l.destinationCity}, ${l.destinationState}`;
    const state = `${l.originState}-${l.destinationState}`;
    cityPosts.set(city, (cityPosts.get(city) ?? 0) + 1);
    statePosts.set(state, (statePosts.get(state) ?? 0) + 1);
    const s = shipperPosts.get(l.shipperCompanyId) ?? {
      legalName: l.shipperCompany.legalName,
      phone: l.shipperCompany.businessPhone,
      posts: 0,
    };
    s.posts += 1;
    shipperPosts.set(l.shipperCompanyId, s);
  }

  for (const b of bookings) {
    const city = `${b.load.originCity}, ${b.load.originState} → ${b.load.destinationCity}, ${b.load.destinationState}`;
    const state = `${b.load.originState}-${b.load.destinationState}`;
    cityBooks.set(city, (cityBooks.get(city) ?? 0) + 1);
    stateBooks.set(state, (stateBooks.get(state) ?? 0) + 1);
    const c = carrierBooks.get(b.carrierCompanyId) ?? {
      legalName: b.carrierCompany.legalName,
      phone: b.carrierCompany.businessPhone,
      bookings: 0,
    };
    c.bookings += 1;
    carrierBooks.set(b.carrierCompanyId, c);
  }

  const cityKeys = new Set([...cityPosts.keys(), ...cityBooks.keys()]);
  const topCityLanes = Array.from(cityKeys)
    .map((lane) => ({
      lane,
      posts: cityPosts.get(lane) ?? 0,
      bookings: cityBooks.get(lane) ?? 0,
    }))
    .sort((a, b) => b.posts + b.bookings - (a.posts + a.bookings))
    .slice(0, 25);

  const stateKeys = new Set([...statePosts.keys(), ...stateBooks.keys()]);
  const topStatePairs = Array.from(stateKeys)
    .map((statePair) => ({
      statePair,
      posts: statePosts.get(statePair) ?? 0,
      bookings: stateBooks.get(statePair) ?? 0,
    }))
    .sort((a, b) => b.posts + b.bookings - (a.posts + a.bookings))
    .slice(0, 20);

  const topShippersByPosts = Array.from(shipperPosts.entries())
    .map(([companyId, v]) => ({
      companyId,
      legalName: v.legalName,
      posts: v.posts,
      phone: v.phone,
    }))
    .sort((a, b) => b.posts - a.posts)
    .slice(0, 20);

  const topCarriersByBooks = Array.from(carrierBooks.entries())
    .map(([companyId, v]) => ({
      companyId,
      legalName: v.legalName,
      bookings: v.bookings,
      phone: v.phone,
    }))
    .sort((a, b) => b.bookings - a.bookings)
    .slice(0, 20);

  return {
    generatedAt: new Date().toISOString(),
    periodDays,
    totals: {
      loadsPosted: loads.length,
      bookings: bookings.length,
      activeShippers: shipperPosts.size,
      activeCarriers: carrierBooks.size,
      observationRows,
    },
    topCityLanes,
    topStatePairs,
    topShippersByPosts,
    topCarriersByBooks,
    thinLanes,
  };
}
