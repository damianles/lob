import { NextResponse } from "next/server";

import { PickupConfirmError, confirmLoadPickupByLoadId } from "@/lib/confirm-load-pickup";
import { prisma } from "@/lib/prisma";
import { getActorContext } from "@/lib/request-context";
import { isSupplierActor } from "@/lib/simulated-actor-company";

export async function POST(_req: Request, ctx: { params: Promise<{ loadId: string }> }) {
  const actor = await getActorContext();
  const { loadId } = await ctx.params;

  const load = await prisma.load.findUnique({
    where: { id: loadId },
    select: {
      shipperCompanyId: true,
      booking: { select: { carrierCompanyId: true } },
    },
  });
  if (!load) {
    return NextResponse.json({ error: "Load not found." }, { status: 404 });
  }

  const isShipperOwner =
    isSupplierActor(actor) && load.shipperCompanyId === actor.companyId;
  const isBookedCarrier =
    actor.role === "DISPATCHER" &&
    Boolean(actor.companyId) &&
    load.booking?.carrierCompanyId === actor.companyId;

  if (!isShipperOwner && !isBookedCarrier) {
    return NextResponse.json(
      { error: "Only the booked carrier (or the posting supplier) can confirm pickup." },
      { status: 403 },
    );
  }

  try {
    const updated = await confirmLoadPickupByLoadId(loadId);
    return NextResponse.json({ data: updated });
  } catch (e) {
    if (e instanceof PickupConfirmError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }
}
