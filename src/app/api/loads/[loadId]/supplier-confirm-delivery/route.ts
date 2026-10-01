import { NextResponse } from "next/server";

import { DeliveryConfirmError, confirmSupplierDeliveryByLoadId } from "@/lib/confirm-load-delivery";
import { prisma } from "@/lib/prisma";
import { getActorContext } from "@/lib/request-context";
import { isSupplierActor } from "@/lib/simulated-actor-company";

export async function POST(_req: Request, ctx: { params: Promise<{ loadId: string }> }) {
  const actor = await getActorContext();
  if (!isSupplierActor(actor)) {
    return NextResponse.json({ error: "Supplier accounts only." }, { status: 403 });
  }

  const { loadId } = await ctx.params;
  const load = await prisma.load.findUnique({
    where: { id: loadId },
    select: { shipperCompanyId: true },
  });
  if (!load) {
    return NextResponse.json({ error: "Load not found." }, { status: 404 });
  }
  if (load.shipperCompanyId !== actor.companyId) {
    return NextResponse.json({ error: "You can only confirm delivery on your own loads." }, { status: 403 });
  }

  try {
    const updated = await confirmSupplierDeliveryByLoadId(loadId);
    return NextResponse.json({ data: updated });
  } catch (e) {
    if (e instanceof DeliveryConfirmError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }
}
