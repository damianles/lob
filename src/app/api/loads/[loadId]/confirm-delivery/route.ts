import { NextResponse } from "next/server";

import { DeliveryConfirmError, confirmLoadDeliveryByLoadId } from "@/lib/confirm-load-delivery";
import { prisma } from "@/lib/prisma";
import { getActorContext } from "@/lib/request-context";

export async function POST(_req: Request, ctx: { params: Promise<{ loadId: string }> }) {
  const actor = await getActorContext();
  if (!actor.userId || !actor.companyId || actor.role !== "DISPATCHER") {
    return NextResponse.json({ error: "Carrier accounts only." }, { status: 403 });
  }

  const { loadId } = await ctx.params;
  const load = await prisma.load.findUnique({
    where: { id: loadId },
    select: {
      booking: { select: { carrierCompanyId: true } },
    },
  });
  if (!load) {
    return NextResponse.json({ error: "Load not found." }, { status: 404 });
  }
  if (!load.booking || load.booking.carrierCompanyId !== actor.companyId) {
    return NextResponse.json({ error: "You can only check in delivery on loads you booked." }, { status: 403 });
  }

  try {
    const updated = await confirmLoadDeliveryByLoadId(loadId);
    return NextResponse.json({ data: updated });
  } catch (e) {
    if (e instanceof DeliveryConfirmError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }
}
