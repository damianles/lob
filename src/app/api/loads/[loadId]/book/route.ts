import { NextResponse } from "next/server";
import { LoadStatus, OfferCurrency, VerificationStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
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

  const load = await prisma.load.findUnique({ where: { id: loadId } });
  if (!load) {
    return NextResponse.json({ error: "Load not found." }, { status: 404 });
  }
  if (load.status !== LoadStatus.POSTED) {
    return NextResponse.json({ error: "Only posted loads can be booked." }, { status: 409 });
  }

  const agreedCurrency: OfferCurrency =
    parsed.data.agreedCurrency ?? load.offerCurrency ?? OfferCurrency.USD;

  const booking = await prisma.$transaction(async (tx) => {
    const newBooking = await tx.booking.create({
      data: {
        loadId,
        carrierCompanyId,
        agreedCurrency,
        agreedRateUsd: parsed.data.agreedRateUsd,
      },
    });

    await tx.load.update({
      where: { id: loadId },
      data: {
        status: LoadStatus.BOOKED,
      },
    });

    return newBooking;
  });

  return NextResponse.json({ data: booking }, { status: 201 });
}

