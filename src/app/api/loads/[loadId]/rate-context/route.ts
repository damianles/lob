import { LoadStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { carrierMayViewPostedLoad } from "@/lib/carrier-load-access";
import { getLaneDecisionContext } from "@/lib/lane-decision-context";
import { prisma } from "@/lib/prisma";
import { getActorContext } from "@/lib/request-context";

export async function GET(_req: Request, ctx: { params: Promise<{ loadId: string }> }) {
  const actor = await getActorContext();
  if (!actor.userId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  if (actor.role === "DRIVER") {
    return NextResponse.json({ error: "Rates are not shown on driver views." }, { status: 403 });
  }

  const { loadId } = await ctx.params;
  const load = await prisma.load.findUnique({
    where: { id: loadId },
    select: {
      id: true,
      status: true,
      shipperCompanyId: true,
      carrierVisibilityMode: true,
      originState: true,
      originCity: true,
      originZip: true,
      destinationState: true,
      destinationCity: true,
      destinationZip: true,
      equipmentType: true,
      offerCurrency: true,
      booking: { select: { carrierCompanyId: true } },
    },
  });
  if (!load) return NextResponse.json({ error: "Load not found." }, { status: 404 });

  const isOwner = actor.role === "SHIPPER" && actor.companyId === load.shipperCompanyId;
  const isBookedCarrier =
    Boolean(load.booking) && actor.companyId === load.booking!.carrierCompanyId;
  const isRealAdmin = actor.realRole === "ADMIN" && !actor.simulated;
  const isCarrier = actor.role === "DISPATCHER" || actor.role === "ADMIN";

  if (!isOwner && !isBookedCarrier && !isRealAdmin && !isCarrier) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }

  if (isCarrier && !isOwner && !isBookedCarrier && !isRealAdmin) {
    if (!actor.companyId || load.status !== LoadStatus.POSTED) {
      return NextResponse.json({ error: "Not allowed." }, { status: 403 });
    }
    const maySee = await carrierMayViewPostedLoad(prisma, load, actor.companyId);
    if (!maySee) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }

  const asShipper = isOwner || isRealAdmin;
  const companyId = asShipper ? load.shipperCompanyId : actor.companyId;

  const data = await getLaneDecisionContext({
    originState: load.originState,
    destinationState: load.destinationState,
    originZip: load.originZip,
    destinationZip: load.destinationZip,
    originCity: load.originCity,
    destinationCity: load.destinationCity,
    equipmentType: load.equipmentType,
    offerCurrency: load.offerCurrency,
    companyId,
    asShipper,
  });

  return NextResponse.json({ data });
}
