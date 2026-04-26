import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getActorContext } from "@/lib/request-context";

/**
 * Returns the distinct origin and destination address triples
 * (city, state, zip) the authenticated shipper has used on past loads,
 * plus any saved-lane endpoints, sorted by frequency × recency.
 *
 * Used to seed the <datalist> autocompletes on the post-load form so
 * mills get drop-downs of *their own* addresses without retyping.
 */

type AddressRow = {
  city: string;
  state: string;
  zip: string;
  count: number;
  /** Last time this address appeared on a load. Used for sorting. */
  lastUsedAt: string;
};

function bumpInto(
  map: Map<string, AddressRow>,
  city: string,
  state: string,
  zip: string,
  when: Date,
) {
  if (!city || !state || !zip) return;
  const key = `${city.toLowerCase()}|${state.toUpperCase()}|${zip}`;
  const existing = map.get(key);
  const isoWhen = when.toISOString();
  if (existing) {
    existing.count += 1;
    if (isoWhen > existing.lastUsedAt) existing.lastUsedAt = isoWhen;
  } else {
    map.set(key, { city, state: state.toUpperCase(), zip, count: 1, lastUsedAt: isoWhen });
  }
}

export async function GET() {
  const actor = await getActorContext();
  if (!actor.companyId || actor.role !== "SHIPPER") {
    return NextResponse.json({ error: "Sign in as a supplier." }, { status: 401 });
  }

  // Cap at the most recent 200 loads — keeps the response tiny on big shippers.
  const loads = await prisma.load.findMany({
    where: { shipperCompanyId: actor.companyId },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      originCity: true,
      originState: true,
      originZip: true,
      destinationCity: true,
      destinationState: true,
      destinationZip: true,
      createdAt: true,
    },
  });

  const lanes = await prisma.savedLane.findMany({
    where: { companyId: actor.companyId },
    select: {
      originCity: true,
      originState: true,
      originZip: true,
      destinationCity: true,
      destinationState: true,
      destinationZip: true,
      lastUsedAt: true,
      createdAt: true,
    },
  });

  const origins = new Map<string, AddressRow>();
  const destinations = new Map<string, AddressRow>();

  for (const l of loads) {
    bumpInto(origins, l.originCity, l.originState, l.originZip, l.createdAt);
    bumpInto(destinations, l.destinationCity, l.destinationState, l.destinationZip, l.createdAt);
  }
  for (const l of lanes) {
    const when = l.lastUsedAt ?? l.createdAt;
    bumpInto(origins, l.originCity, l.originState, l.originZip, when);
    bumpInto(destinations, l.destinationCity, l.destinationState, l.destinationZip, when);
  }

  const sortFreq = (a: AddressRow, b: AddressRow) =>
    b.count - a.count || (a.lastUsedAt < b.lastUsedAt ? 1 : -1);

  return NextResponse.json({
    origins: [...origins.values()].sort(sortFreq).slice(0, 50),
    destinations: [...destinations.values()].sort(sortFreq).slice(0, 50),
  });
}
