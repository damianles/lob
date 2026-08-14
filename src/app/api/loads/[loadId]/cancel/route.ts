import { LoadStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getActorContext } from "@/lib/request-context";
import { isSupplierActor } from "@/lib/simulated-actor-company";

const CANCELLABLE: LoadStatus[] = [
  LoadStatus.POSTED,
  LoadStatus.BOOKED,
  LoadStatus.ASSIGNED,
];

/**
 * Supplier cancels their own load (POSTED / BOOKED / ASSIGNED only).
 */
export async function POST(_req: Request, ctx: { params: Promise<{ loadId: string }> }) {
  const { loadId } = await ctx.params;
  const actor = await getActorContext();

  if (!isSupplierActor(actor) && !(actor.realRole === "ADMIN" && !actor.simulated)) {
    return NextResponse.json({ error: "Only the posting supplier can cancel this load." }, { status: 403 });
  }

  const load = await prisma.load.findUnique({
    where: { id: loadId },
    select: {
      id: true,
      status: true,
      shipperCompanyId: true,
      referenceNumber: true,
    },
  });

  if (!load) {
    return NextResponse.json({ error: "Load not found." }, { status: 404 });
  }

  const isOwner =
    isSupplierActor(actor) && load.shipperCompanyId === actor.companyId;
  const isRealAdmin = actor.realRole === "ADMIN" && !actor.simulated;

  if (!isOwner && !isRealAdmin) {
    return NextResponse.json({ error: "You can only cancel loads posted by your company." }, { status: 403 });
  }

  if (load.status === LoadStatus.CANCELLED) {
    return NextResponse.json({ data: { id: load.id, status: load.status, referenceNumber: load.referenceNumber } });
  }

  if (load.status === LoadStatus.DELIVERED || load.status === LoadStatus.IN_TRANSIT) {
    return NextResponse.json(
      { error: `Cannot cancel a load that is ${load.status.toLowerCase().replace("_", " ")}.` },
      { status: 409 },
    );
  }

  if (!CANCELLABLE.includes(load.status)) {
    return NextResponse.json({ error: `Cannot cancel load in status ${load.status}.` }, { status: 409 });
  }

  const updated = await prisma.load.update({
    where: { id: load.id },
    data: { status: LoadStatus.CANCELLED },
    select: { id: true, status: true, referenceNumber: true },
  });

  return NextResponse.json({ data: updated });
}
