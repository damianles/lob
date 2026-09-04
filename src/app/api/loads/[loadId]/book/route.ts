import { NextResponse } from "next/server";
import { LoadBidStatus, LoadRateMode, LoadStatus, OfferCurrency, VerificationStatus } from "@prisma/client";

import { carrierMayViewPostedLoad } from "@/lib/carrier-load-access";
import { prisma } from "@/lib/prisma";
import { TAKE_IT_LABEL } from "@/lib/rate-mode";
import { getActorContext } from "@/lib/request-context";
import { createBookingSchema } from "@/lib/validation";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ loadId: string }> },
) {
  const actor = await getActorContext();
  if (!actor.userId || !actor.companyId) {
    return NextResponse.json({ error: "Sign in and complete onboarding to book loads." }, { status: 401 });
  }
  if (actor.role !== "DISPATCHER" && actor.role !== "ADMIN") {
    return NextResponse.json({ error: "Only carrier dispatchers can book loads." }, { status: 403 });
  }

  const carrier = await prisma.company.findUnique({
    where: { id: actor.companyId },
    select: { verificationStatus: true },
  });
  if (!carrier || carrier.verificationStatus !== VerificationStatus.APPROVED) {
    return NextResponse.json({ error: "Your carrier must be approved before booking." }, { status: 403 });
  }

  const { loadId } = await ctx.params;
  const body = await req.json();
  const parsed = createBookingSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const carrierCompanyId = parsed.data.carrierCompanyId ?? actor.companyId;
  if (carrierCompanyId !== actor.companyId) {
    return NextResponse.json({ error: "You can only book for your own carrier company." }, { status: 403 });
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
    },
  });
  if (!load) {
    return NextResponse.json({ error: "Load not found." }, { status: 404 });
  }
  if (load.status !== LoadStatus.POSTED) {
    return NextResponse.json({ error: "Only posted loads can be booked." }, { status: 409 });
  }
  if (load.rateMode === LoadRateMode.OPEN_BID) {
    return NextResponse.json(
      { error: "This load is Open bid — submit a bid instead of booking instantly." },
      { status: 409 },
    );
  }
  if (load.offeredRateUsd == null) {
    return NextResponse.json({ error: `This ${TAKE_IT_LABEL} load has no posted rate.` }, { status: 409 });
  }

  const mayBook = await carrierMayViewPostedLoad(prisma, load, carrierCompanyId);
  if (!mayBook) {
    return NextResponse.json(
      { error: "This load is not offered to your carrier (supplier visibility rules)." },
      { status: 403 },
    );
  }

  if (
    parsed.data.agreedRateUsd != null &&
    Number(load.offeredRateUsd) !== parsed.data.agreedRateUsd
  ) {
    if (load.allowCounterOffers) {
      return NextResponse.json(
        { error: `To change the ${TAKE_IT_LABEL}, submit a counter from Open Bids — or book the posted rate.` },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: `${TAKE_IT_LABEL} loads book at the posted rate only.` },
      { status: 409 },
    );
  }

  const agreedCurrency: OfferCurrency = load.offerCurrency ?? OfferCurrency.CAD;

  const booking = await prisma.$transaction(async (tx) => {
    const stillOpen = await tx.load.findFirst({
      where: { id: loadId, status: LoadStatus.POSTED },
      select: { id: true },
    });
    if (!stillOpen) {
      throw new Error("LOAD_NOT_POSTED");
    }

    const newBooking = await tx.booking.create({
      data: {
        loadId,
        carrierCompanyId,
        agreedCurrency,
        agreedRateUsd: load.offeredRateUsd!,
      },
    });

    await tx.load.update({
      where: { id: loadId },
      data: { status: LoadStatus.BOOKED },
    });

    await tx.loadBid.updateMany({
      where: { loadId, status: LoadBidStatus.PENDING },
      data: { status: LoadBidStatus.DECLINED },
    });

    const now = new Date();
    await tx.laneRateObservation.updateMany({
      where: { loadId },
      data: {
        bookedRateUsd: load.offeredRateUsd!,
        bookedAt: now,
        outcome: "BOOKED",
      },
    });

    return newBooking;
  }).catch((e: unknown) => {
    if (e instanceof Error && e.message === "LOAD_NOT_POSTED") return null;
    throw e;
  });

  if (!booking) {
    return NextResponse.json({ error: "This load is no longer posted." }, { status: 409 });
  }

  return NextResponse.json({ data: booking }, { status: 201 });
}
