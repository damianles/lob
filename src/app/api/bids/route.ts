import { LoadBidStatus, LoadRateMode, LoadStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { fetchPostedLoadVisibilityContext, postedLoadVisibleToCarrier } from "@/lib/carrier-load-access";
import { expireStaleBids } from "@/lib/load-bids";
import { prisma } from "@/lib/prisma";
import { getActorContext } from "@/lib/request-context";
import { isSupplierActor } from "@/lib/simulated-actor-company";

export async function GET() {
  const actor = await getActorContext();
  if (!actor.userId || !actor.companyId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  await expireStaleBids();

  const isShipper = isSupplierActor(actor);
  const isCarrier = actor.role === "DISPATCHER" || actor.role === "ADMIN";
  const isRealAdmin = actor.realRole === "ADMIN" && !actor.simulated;

  if (!isShipper && !isCarrier && !isRealAdmin) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }

  if (isShipper) {
    const loads = await prisma.load.findMany({
      where: {
        shipperCompanyId: actor.companyId,
        status: LoadStatus.POSTED,
        OR: [
          { rateMode: LoadRateMode.OPEN_BID },
          { rateMode: LoadRateMode.TAKE_IT, allowCounterOffers: true, bids: { some: { status: LoadBidStatus.PENDING } } },
        ],
      },
      orderBy: [{ bidWindowExpiresAt: "asc" }, { createdAt: "desc" }],
      include: {
        bids: {
          where: { status: LoadBidStatus.PENDING },
          orderBy: { createdAt: "desc" },
          include: { carrierCompany: { select: { legalName: true } } },
        },
        _count: { select: { bids: { where: { status: LoadBidStatus.PENDING } } } },
      },
      take: 100,
    });

    return NextResponse.json({
      perspective: "shipper",
      data: loads.map((l) => ({
        id: l.id,
        referenceNumber: l.referenceNumber,
        originCity: l.originCity,
        originState: l.originState,
        destinationCity: l.destinationCity,
        destinationState: l.destinationState,
        equipmentType: l.equipmentType,
        weightLbs: l.weightLbs,
        offerCurrency: l.offerCurrency,
        offeredRateUsd: l.offeredRateUsd != null ? Number(l.offeredRateUsd) : null,
        rateMode: l.rateMode,
        allowCounterOffers: l.allowCounterOffers,
        bidWindowExpiresAt: l.bidWindowExpiresAt?.toISOString() ?? null,
        requestedPickupAt: l.requestedPickupAt.toISOString(),
        pendingCount: l._count.bids,
        bids: l.bids.map((b) => ({
          id: b.id,
          kind: b.kind,
          amountUsd: Number(b.amountUsd),
          currency: b.currency,
          note: b.note,
          expiresAt: b.expiresAt.toISOString(),
          createdAt: b.createdAt.toISOString(),
          carrierName: b.carrierCompany.legalName,
        })),
      })),
    });
  }

  const bids = await prisma.loadBid.findMany({
    where: {
      carrierCompanyId: actor.companyId!,
      status: { in: [LoadBidStatus.PENDING, LoadBidStatus.DECLINED, LoadBidStatus.EXPIRED, LoadBidStatus.WITHDRAWN] },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      load: {
        select: {
          id: true,
          referenceNumber: true,
          originCity: true,
          originState: true,
          destinationCity: true,
          destinationState: true,
          equipmentType: true,
          weightLbs: true,
          offerCurrency: true,
          offeredRateUsd: true,
          rateMode: true,
          allowCounterOffers: true,
          bidWindowExpiresAt: true,
          requestedPickupAt: true,
          status: true,
          shipperCompanyId: true,
          carrierVisibilityMode: true,
        },
      },
    },
  });

  let visible = bids;
  if (actor.companyId) {
    const posted = bids.filter((b) => b.load.status === LoadStatus.POSTED).map((b) => b.load);
    if (posted.length) {
      const ctx = await fetchPostedLoadVisibilityContext(prisma, actor.companyId, posted);
      visible = bids.filter((b) => {
        if (b.load.status !== LoadStatus.POSTED) return true;
        return postedLoadVisibleToCarrier(b.load, ctx);
      });
    }
  }

  return NextResponse.json({
    perspective: "carrier",
    data: visible.map((b) => ({
      id: b.id,
      kind: b.kind,
      status: b.status,
      amountUsd: Number(b.amountUsd),
      currency: b.currency,
      note: b.note,
      expiresAt: b.expiresAt.toISOString(),
      createdAt: b.createdAt.toISOString(),
      load: {
        id: b.load.id,
        referenceNumber: b.load.referenceNumber,
        originCity: b.load.originCity,
        originState: b.load.originState,
        destinationCity: b.load.destinationCity,
        destinationState: b.load.destinationState,
        equipmentType: b.load.equipmentType,
        weightLbs: b.load.weightLbs,
        offerCurrency: b.load.offerCurrency,
        offeredRateUsd: b.load.offeredRateUsd != null ? Number(b.load.offeredRateUsd) : null,
        rateMode: b.load.rateMode,
        allowCounterOffers: b.load.allowCounterOffers,
        bidWindowExpiresAt: b.load.bidWindowExpiresAt?.toISOString() ?? null,
        requestedPickupAt: b.load.requestedPickupAt.toISOString(),
        status: b.load.status,
      },
    })),
  });
}
