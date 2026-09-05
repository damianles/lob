import {
  CapacityInterestStatus,
  LoadBidStatus,
  LoadStatus,
  OfferCurrency,
  PostedLaneOutcome,
  Prisma,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

export class CapacityInterestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "CapacityInterestError";
  }
}

/**
 * Carrier accepts a supplier capacity request → book the linked load at the load rate
 * (or capacity asking rate if the load has no posted rate). Identity unlocks via booking.
 */
export async function acceptCapacityInterest(args: {
  interestId: string;
  carrierCompanyId: string;
  reviewedByUserId: string;
}) {
  return prisma.$transaction(async (tx) => {
    const interest = await tx.capacityInterest.findUnique({
      where: { id: args.interestId },
      include: {
        capacity: true,
        load: {
          select: {
            id: true,
            status: true,
            shipperCompanyId: true,
            offerCurrency: true,
            offeredRateUsd: true,
            booking: { select: { id: true } },
          },
        },
      },
    });
    if (!interest) throw new CapacityInterestError("Request not found.", 404);
    if (interest.carrierCompanyId !== args.carrierCompanyId) {
      throw new CapacityInterestError("Not your capacity request.", 403);
    }
    if (interest.status !== CapacityInterestStatus.PENDING) {
      throw new CapacityInterestError("This request is no longer pending.", 409);
    }
    if (interest.capacity.status !== "OPEN") {
      throw new CapacityInterestError("This capacity is no longer open.", 409);
    }
    if (interest.load.status !== LoadStatus.POSTED || interest.load.booking) {
      throw new CapacityInterestError("That load is no longer open to book.", 409);
    }

    const rate =
      interest.load.offeredRateUsd != null
        ? interest.load.offeredRateUsd
        : interest.capacity.askingRateUsd;
    const currency: OfferCurrency = interest.load.offerCurrency ?? OfferCurrency.CAD;
    const now = new Date();

    await tx.capacityInterest.update({
      where: { id: interest.id },
      data: {
        status: CapacityInterestStatus.ACCEPTED,
        reviewedAt: now,
        reviewedByUserId: args.reviewedByUserId,
      },
    });

    await tx.capacityInterest.updateMany({
      where: {
        loadId: interest.loadId,
        status: CapacityInterestStatus.PENDING,
        id: { not: interest.id },
      },
      data: {
        status: CapacityInterestStatus.DECLINED,
        reviewedAt: now,
        reviewedByUserId: args.reviewedByUserId,
      },
    });

    await tx.capacityInterest.updateMany({
      where: {
        capacityOfferId: interest.capacityOfferId,
        status: CapacityInterestStatus.PENDING,
        id: { not: interest.id },
      },
      data: {
        status: CapacityInterestStatus.EXPIRED,
        reviewedAt: now,
      },
    });

    await tx.capacityOffer.update({
      where: { id: interest.capacityOfferId },
      data: { status: "MATCHED" },
    });

    await tx.loadBid.updateMany({
      where: { loadId: interest.loadId, status: LoadBidStatus.PENDING },
      data: { status: LoadBidStatus.DECLINED, reviewedAt: now, reviewedByUserId: args.reviewedByUserId },
    });

    const booking = await tx.booking.create({
      data: {
        loadId: interest.loadId,
        carrierCompanyId: args.carrierCompanyId,
        agreedCurrency: currency,
        agreedRateUsd: rate,
      },
    });

    await tx.load.update({
      where: { id: interest.loadId },
      data: { status: LoadStatus.BOOKED },
    });

    await tx.laneRateObservation.updateMany({
      where: { loadId: interest.loadId },
      data: {
        bookedRateUsd: rate,
        bookedAt: now,
        outcome: PostedLaneOutcome.BOOKED,
      },
    });

    return { interestId: interest.id, bookingId: booking.id, loadId: interest.loadId };
  });
}

export async function declineCapacityInterest(args: {
  interestId: string;
  carrierCompanyId: string;
  reviewedByUserId: string;
}) {
  const interest = await prisma.capacityInterest.findUnique({
    where: { id: args.interestId },
    select: { id: true, status: true, carrierCompanyId: true },
  });
  if (!interest) throw new CapacityInterestError("Request not found.", 404);
  if (interest.carrierCompanyId !== args.carrierCompanyId) {
    throw new CapacityInterestError("Not your capacity request.", 403);
  }
  if (interest.status !== CapacityInterestStatus.PENDING) {
    throw new CapacityInterestError("This request is no longer pending.", 409);
  }

  return prisma.capacityInterest.update({
    where: { id: interest.id },
    data: {
      status: CapacityInterestStatus.DECLINED,
      reviewedAt: new Date(),
      reviewedByUserId: args.reviewedByUserId,
    },
  });
}

export async function withdrawCapacityInterest(args: {
  interestId: string;
  shipperCompanyId: string;
}) {
  const interest = await prisma.capacityInterest.findUnique({
    where: { id: args.interestId },
    select: { id: true, status: true, shipperCompanyId: true },
  });
  if (!interest) throw new CapacityInterestError("Request not found.", 404);
  if (interest.shipperCompanyId !== args.shipperCompanyId) {
    throw new CapacityInterestError("Not your request.", 403);
  }
  if (interest.status !== CapacityInterestStatus.PENDING) {
    throw new CapacityInterestError("This request is no longer pending.", 409);
  }

  return prisma.capacityInterest.update({
    where: { id: interest.id },
    data: { status: CapacityInterestStatus.WITHDRAWN },
  });
}

export function serializeCapacityInterestError(e: unknown): { error: string; status: number } | null {
  if (e instanceof CapacityInterestError) return { error: e.message, status: e.status };
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
    return { error: "You already requested this capacity for that load.", status: 409 };
  }
  return null;
}
