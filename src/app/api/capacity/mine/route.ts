import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getActorContext } from "@/lib/request-context";

/** Carrier-facing list of this company's capacity posts (includes expired OPEN rows for repost UI). */
export async function GET() {
  const actor = await getActorContext();
  if (!actor.companyId || !actor.userId) {
    return NextResponse.json({ error: "Sign in and link a carrier company." }, { status: 401 });
  }
  if (actor.role !== "DISPATCHER" && actor.role !== "ADMIN") {
    return NextResponse.json({ error: "Carriers only." }, { status: 403 });
  }

  const rows = await prisma.capacityOffer.findMany({
    where: { carrierCompanyId: actor.companyId, status: "OPEN" },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  const now = new Date();
  const data = rows.map((r) => ({
    id: r.id,
    originZip: r.originZip,
    originCity: r.originCity,
    originState: r.originState,
    destinationZip: r.destinationZip,
    destinationCity: r.destinationCity,
    destinationState: r.destinationState,
    equipmentType: r.equipmentType,
    askingRateUsd: Number(r.askingRateUsd),
    notes: r.notes,
    availableFrom: r.availableFrom.toISOString(),
    availableUntil: r.availableUntil.toISOString(),
    isExpired: r.availableUntil < now,
  }));

  return NextResponse.json({ data });
}
