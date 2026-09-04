import { LoadBidKind, LoadBidStatus, LoadRateMode, LoadStatus, VerificationStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { BID_ACCEPT_HOURS } from "@/lib/board-visibility";
import { carrierMayViewPostedLoad } from "@/lib/carrier-load-access";
import { expireStaleBids, LoadBidError } from "@/lib/load-bids";
import { computeBidAcceptExpiresAt } from "@/lib/load-lifecycle";
import { validateRateBand } from "@/lib/market-rate-lane";
import { prisma } from "@/lib/prisma";
import { TAKE_IT_LABEL } from "@/lib/rate-mode";
import { getActorContext } from "@/lib/request-context";
import { createLoadBidSchema } from "@/lib/validation";

export async function GET(_req: Request, ctx: { params: Promise<{ loadId: string }> }) {
  const actor = await getActorContext();
  const { loadId } = await ctx.params;

  const load = await prisma.load.findUnique({
    where: { id: loadId },
    select: {
      id: true,
      shipperCompanyId: true,
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

  await expireStaleBids();

  const where =
    isOwner || isRealAdmin
      ? { loadId }
      : { loadId, carrierCompanyId: actor.companyId ?? "__none__" };

  const rows = await prisma.loadBid.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      carrierCompany: { select: { legalName: true } },
    },
  });

  return NextResponse.json({
    data: rows.map((b) => ({
      ...b,
      amountUsd: Number(b.amountUsd),
      carrierName: isOwner || isRealAdmin ? b.carrierCompany.legalName : null,
    })),
  });
}

export async function POST(req: Request, ctx: { params: Promise<{ loadId: string }> }) {
  const actor = await getActorContext();
  if (!actor.userId || !actor.companyId) {
    return NextResponse.json({ error: "Sign in and complete onboarding to bid." }, { status: 401 });
  }
  if (actor.role !== "DISPATCHER" && actor.role !== "ADMIN") {
    return NextResponse.json({ error: "Only carrier dispatchers can bid." }, { status: 403 });
  }

  const carrier = await prisma.company.findUnique({
    where: { id: actor.companyId },
    select: { verificationStatus: true },
  });
  if (!carrier || carrier.verificationStatus !== VerificationStatus.APPROVED) {
    return NextResponse.json({ error: "Your carrier must be approved before bidding." }, { status: 403 });
  }

  const { loadId } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = createLoadBidSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const load = await prisma.load.findUnique({
    where: { id: loadId },
    select: {
      id: true,
      status: true,
      shipperCompanyId: true,
      carrierVisibilityMode: true,
      offerCurrency: true,
      offeredRateUsd: true,
      rateMode: true,
      allowCounterOffers: true,
      bidWindowExpiresAt: true,
      requestedPickupAt: true,
      originState: true,
      originCity: true,
      originZip: true,
      destinationState: true,
      destinationCity: true,
      destinationZip: true,
      equipmentType: true,
    },
  });
  if (!load) return NextResponse.json({ error: "Load not found." }, { status: 404 });
  if (load.status !== LoadStatus.POSTED) {
    return NextResponse.json({ error: "Only posted loads accept bids." }, { status: 409 });
  }

  const maySee = await carrierMayViewPostedLoad(prisma, load, actor.companyId);
  if (!maySee) {
    return NextResponse.json({ error: "This load is not offered to your carrier." }, { status: 403 });
  }

  const isOpenBid = load.rateMode === LoadRateMode.OPEN_BID;
  const isCounter = load.rateMode === LoadRateMode.TAKE_IT && load.allowCounterOffers;
  if (!isOpenBid && !isCounter) {
    return NextResponse.json(
      { error: `${TAKE_IT_LABEL} loads with counters off cannot be bid — book the posted rate.` },
      { status: 409 },
    );
  }

  await expireStaleBids();

  const now = new Date();
  if (isOpenBid && load.bidWindowExpiresAt && load.bidWindowExpiresAt <= now) {
    return NextResponse.json({ error: "The bid window for this load has closed." }, { status: 410 });
  }

  const windowEnd = isOpenBid
    ? load.bidWindowExpiresAt ?? load.requestedPickupAt
    : new Date(now.getTime() + BID_ACCEPT_HOURS * 60 * 60 * 1000);

  const band = await validateRateBand({
    originState: load.originState,
    destinationState: load.destinationState,
    originZip: load.originZip,
    destinationZip: load.destinationZip,
    originCity: load.originCity,
    destinationCity: load.destinationCity,
    equipmentType: load.equipmentType,
    offerCurrency: load.offerCurrency,
    amount: parsed.data.amountUsd,
  });
  if (!band.ok) {
    return NextResponse.json({ error: band.message }, { status: 400 });
  }

  // Supplier has at most 24h to accept from (re)submit; never past the load bid window.
  const expiresAt = computeBidAcceptExpiresAt({
    now,
    bidWindowExpiresAt: isOpenBid ? windowEnd : new Date(now.getTime() + BID_ACCEPT_HOURS * 60 * 60 * 1000),
  });
  const finalExpires =
    parsed.data.expiresInHours != null
      ? new Date(
          Math.min(
            expiresAt.getTime(),
            now.getTime() + Math.min(BID_ACCEPT_HOURS, parsed.data.expiresInHours) * 60 * 60 * 1000,
          ),
        )
      : expiresAt;

  try {
    const existing = await prisma.loadBid.findFirst({
      where: {
        loadId,
        carrierCompanyId: actor.companyId,
        status: LoadBidStatus.PENDING,
      },
    });

    const data = {
      amountUsd: parsed.data.amountUsd,
      currency: load.offerCurrency,
      note: parsed.data.note?.trim() || null,
      expiresAt: finalExpires,
      kind: isCounter ? LoadBidKind.COUNTER : LoadBidKind.BID,
      submittedByUserId: actor.userId,
    };

    const row = existing
      ? await prisma.loadBid.update({
          where: { id: existing.id },
          data,
        })
      : await prisma.loadBid.create({
          data: {
            loadId,
            carrierCompanyId: actor.companyId,
            ...data,
          },
        });

    return NextResponse.json(
      { data: { ...row, amountUsd: Number(row.amountUsd) } },
      { status: existing ? 200 : 201 },
    );
  } catch (e) {
    if (e instanceof LoadBidError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }
}
