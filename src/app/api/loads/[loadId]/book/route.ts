import { NextResponse } from "next/server";
import {
  LoadBidKind,
  LoadBidStatus,
  LoadRateMode,
  LoadStatus,
  NotificationEvent,
  OfferCurrency,
  VerificationStatus,
} from "@prisma/client";

import { BID_ACCEPT_HOURS } from "@/lib/board-visibility";
import { assertCarrierInsuranceCurrent } from "@/lib/carrier-insurance";
import { carrierMayViewPostedLoad } from "@/lib/carrier-load-access";
import { expireStaleBids, LoadBidError } from "@/lib/load-bids";
import { computeBidAcceptExpiresAt } from "@/lib/load-lifecycle";
import { enqueueLoadNotification } from "@/lib/notifications/dispatch";
import { prisma } from "@/lib/prisma";
import { TAKE_IT_LABEL } from "@/lib/rate-mode";
import { getActorContext } from "@/lib/request-context";
import { createBookingSchema } from "@/lib/validation";

/**
 * Firm Rate "book" no longer creates a Booking immediately.
 * It creates a pending TAKE bid at the posted rate; the supplier Accept/Declines.
 */
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

  const insuranceError = await assertCarrierInsuranceCurrent(actor.companyId);
  if (insuranceError) {
    return NextResponse.json({ error: insuranceError }, { status: 403 });
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
      { error: "This load is Open Bid — submit a Bid instead of requesting the Firm Rate." },
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
        {
          error: `To change the ${TAKE_IT_LABEL}, submit a counter from Open Bids — or request the posted rate.`,
        },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: `${TAKE_IT_LABEL} requests must use the posted rate.` },
      { status: 409 },
    );
  }

  await expireStaleBids();

  const agreedCurrency: OfferCurrency = load.offerCurrency ?? OfferCurrency.CAD;
  const now = new Date();
  const expiresAt = computeBidAcceptExpiresAt({
    now,
    bidWindowExpiresAt: new Date(now.getTime() + BID_ACCEPT_HOURS * 60 * 60 * 1000),
  });

  try {
    const existing = await prisma.loadBid.findFirst({
      where: {
        loadId,
        carrierCompanyId,
        status: LoadBidStatus.PENDING,
      },
    });

    const data = {
      amountUsd: load.offeredRateUsd!,
      currency: agreedCurrency,
      note: null as string | null,
      expiresAt,
      kind: LoadBidKind.TAKE,
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
            carrierCompanyId,
            ...data,
          },
        });

    const amount = Number(row.amountUsd);
    const money = Number.isFinite(amount) ? `${amount.toFixed(2)} ${row.currency}` : null;
    enqueueLoadNotification({
      loadId,
      to: "shipper",
      event: NotificationEvent.BID_SUBMITTED,
      dedupeKey: `take-submitted:${row.id}:${row.updatedAt.toISOString()}`,
      headline: `A carrier requested your ${TAKE_IT_LABEL}.`,
      detail: money,
      suppress: actor.simulated,
    });

    return NextResponse.json(
      {
        data: {
          ...row,
          amountUsd: Number(row.amountUsd),
          pendingSupplierConfirm: true,
        },
      },
      { status: existing ? 200 : 201 },
    );
  } catch (e) {
    if (e instanceof LoadBidError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }
}
