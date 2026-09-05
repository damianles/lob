import { LoadStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getActorContext } from "@/lib/request-context";
import { isSupplierActor } from "@/lib/simulated-actor-company";

/**
 * Supplier's posted loads available to attach to a capacity request (option A).
 */
export async function GET() {
  const actor = await getActorContext();
  if (!isSupplierActor(actor) || !actor.companyId) {
    return NextResponse.json({ error: "Supplier accounts only." }, { status: 403 });
  }

  const rows = await prisma.load.findMany({
    where: {
      shipperCompanyId: actor.companyId,
      status: LoadStatus.POSTED,
      booking: { is: null },
    },
    orderBy: { requestedPickupAt: "asc" },
    take: 80,
    select: {
      id: true,
      referenceNumber: true,
      originCity: true,
      originState: true,
      destinationCity: true,
      destinationState: true,
      equipmentType: true,
      offeredRateUsd: true,
      offerCurrency: true,
      rateMode: true,
      requestedPickupAt: true,
      requestedDeliveryAt: true,
    },
  });

  return NextResponse.json({
    data: rows.map((r) => ({
      ...r,
      offeredRateUsd: r.offeredRateUsd != null ? Number(r.offeredRateUsd) : null,
      requestedPickupAt: r.requestedPickupAt.toISOString(),
      requestedDeliveryAt: r.requestedDeliveryAt?.toISOString() ?? null,
    })),
  });
}
