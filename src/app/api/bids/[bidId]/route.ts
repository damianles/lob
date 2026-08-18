import { NextResponse } from "next/server";

import {
  acceptLoadBid,
  declineLoadBid,
  LoadBidError,
  withdrawLoadBid,
} from "@/lib/load-bids";
import { prisma } from "@/lib/prisma";
import { getActorContext } from "@/lib/request-context";
import { isSupplierActor } from "@/lib/simulated-actor-company";
import { reviewLoadBidSchema } from "@/lib/validation";

export async function POST(req: Request, ctx: { params: Promise<{ bidId: string }> }) {
  const actor = await getActorContext();
  const { bidId } = await ctx.params;
  const body = await req.json().catch(() => null);

  const action = typeof body?.action === "string" ? body.action : null;
  if (action === "withdraw") {
    if (!actor.companyId || (actor.role !== "DISPATCHER" && actor.role !== "ADMIN")) {
      return NextResponse.json({ error: "Carriers can withdraw their own bids." }, { status: 403 });
    }
    try {
      const updated = await withdrawLoadBid({ bidId, carrierCompanyId: actor.companyId });
      return NextResponse.json({ data: updated });
    } catch (e) {
      if (e instanceof LoadBidError) {
        return NextResponse.json({ error: e.message }, { status: e.status });
      }
      throw e;
    }
  }

  const parsed = reviewLoadBidSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (!isSupplierActor(actor)) {
    return NextResponse.json({ error: "Supplier accounts only." }, { status: 403 });
  }
  if (!actor.userId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  try {
    if (parsed.data.decision === "ACCEPT") {
      const result = await acceptLoadBid({
        bidId,
        reviewedByUserId: actor.userId,
        shipperCompanyId: actor.companyId,
      });
      return NextResponse.json({ data: result });
    }
    const updated = await declineLoadBid({
      bidId,
      reviewedByUserId: actor.userId,
      shipperCompanyId: actor.companyId,
    });
    return NextResponse.json({ data: updated });
  } catch (e) {
    if (e instanceof LoadBidError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }
}

export async function GET(_req: Request, ctx: { params: Promise<{ bidId: string }> }) {
  const actor = await getActorContext();
  const { bidId } = await ctx.params;
  const bid = await prisma.loadBid.findUnique({
    where: { id: bidId },
    include: { load: { select: { shipperCompanyId: true } } },
  });
  if (!bid) return NextResponse.json({ error: "Bid not found." }, { status: 404 });
  const allowed =
    (actor.role === "SHIPPER" && actor.companyId === bid.load.shipperCompanyId) ||
    (actor.companyId === bid.carrierCompanyId && (actor.role === "DISPATCHER" || actor.role === "ADMIN")) ||
    (actor.realRole === "ADMIN" && !actor.simulated);
  if (!allowed) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  return NextResponse.json({ data: { ...bid, amountUsd: Number(bid.amountUsd) } });
}
