import { NextResponse } from "next/server";

import { listNeedsRepostForCompany } from "@/lib/load-lifecycle";
import { getActorContext } from "@/lib/request-context";
import { isSupplierActor } from "@/lib/simulated-actor-company";

/** Soft-warn + resolve queue for Firm Rate / Open bid loads needing shipper action. */
export async function GET() {
  const actor = await getActorContext();
  if (!isSupplierActor(actor) || !actor.companyId) {
    return NextResponse.json({ error: "Supplier accounts only." }, { status: 403 });
  }

  const rows = await listNeedsRepostForCompany(actor.companyId);
  return NextResponse.json({
    data: rows.map((r) => ({
      ...r,
      offeredRateUsd: r.offeredRateUsd != null ? Number(r.offeredRateUsd) : null,
      requestedPickupAt: r.requestedPickupAt.toISOString(),
      requestedDeliveryAt: r.requestedDeliveryAt?.toISOString() ?? null,
      needsRepostAt: r.needsRepostAt?.toISOString() ?? null,
    })),
    count: rows.length,
  });
}
