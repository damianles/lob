import { NextResponse } from "next/server";

import {
  buildShipperCarrierDiligence,
  shipperMayViewCarrierDiligence,
} from "@/lib/shipper-carrier-diligence";
import { getActorContext } from "@/lib/request-context";
import { isSupplierActor } from "@/lib/simulated-actor-company";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ carrierCompanyId: string }> },
) {
  const actor = await getActorContext();
  if (!isSupplierActor(actor) || !actor.companyId) {
    return NextResponse.json({ error: "Supplier accounts only." }, { status: 403 });
  }

  const { carrierCompanyId } = await ctx.params;
  const may = await shipperMayViewCarrierDiligence(actor.companyId, carrierCompanyId);
  if (!may) {
    return NextResponse.json({ error: "Carrier not found or not approved." }, { status: 404 });
  }

  const data = await buildShipperCarrierDiligence({
    shipperCompanyId: actor.companyId,
    carrierCompanyId,
    includeCreditFile: true,
  });
  if (!data) {
    return NextResponse.json({ error: "Carrier not found." }, { status: 404 });
  }

  return NextResponse.json({ data });
}
