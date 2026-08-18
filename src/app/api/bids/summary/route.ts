import { NextResponse } from "next/server";

import { countPendingBidInbox, expireStaleBids } from "@/lib/load-bids";
import { getActorContext } from "@/lib/request-context";
import { isSupplierActor } from "@/lib/simulated-actor-company";

export async function GET() {
  const actor = await getActorContext();
  if (!actor.userId || !actor.companyId) {
    return NextResponse.json({ pendingInbox: 0 });
  }

  await expireStaleBids();

  const asShipper = isSupplierActor(actor);
  const asCarrier = actor.role === "DISPATCHER" || actor.role === "ADMIN";
  if (!asShipper && !asCarrier) {
    return NextResponse.json({ pendingInbox: 0 });
  }

  const pendingInbox = await countPendingBidInbox({
    companyId: actor.companyId,
    asShipper,
  });

  return NextResponse.json({ pendingInbox });
}
