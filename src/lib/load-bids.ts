import { LoadBidStatus, LoadStatus, type Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export class LoadBidError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "LoadBidError";
  }
}

export async function expireStaleBids(tx?: Prisma.TransactionClient) {
  const db = tx ?? prisma;
  const now = new Date();
  await db.loadBid.updateMany({
    where: {
      status: LoadBidStatus.PENDING,
      OR: [{ expiresAt: { lte: now } }, { load: { bidWindowExpiresAt: { lte: now } } }],
    },
    data: { status: LoadBidStatus.EXPIRED },
  });
}

export async function acceptLoadBid(args: {
  bidId: string;
  reviewedByUserId: string;
  shipperCompanyId: string;
}) {
  return prisma.$transaction(async (tx) => {
    await expireStaleBids(tx);

    const bid = await tx.loadBid.findUnique({
      where: { id: args.bidId },
      include: {
        load: { select: { id: true, status: true, shipperCompanyId: true, booking: { select: { id: true } } } },
      },
    });
    if (!bid) throw new LoadBidError("Bid not found.", 404);
    if (bid.load.shipperCompanyId !== args.shipperCompanyId) {
      throw new LoadBidError("You can only accept bids on your own loads.", 403);
    }
    if (bid.status !== LoadBidStatus.PENDING) {
      throw new LoadBidError("This bid is no longer pending.", 409);
    }
    if (bid.load.status !== LoadStatus.POSTED || bid.load.booking) {
      throw new LoadBidError("This load is no longer open.", 409);
    }
    if (bid.expiresAt <= new Date()) {
      await tx.loadBid.update({
        where: { id: bid.id },
        data: { status: LoadBidStatus.EXPIRED },
      });
      throw new LoadBidError("This bid has expired.", 410);
    }

    const now = new Date();

    await tx.loadBid.update({
      where: { id: bid.id },
      data: {
        status: LoadBidStatus.ACCEPTED,
        reviewedAt: now,
        reviewedByUserId: args.reviewedByUserId,
      },
    });

    await tx.loadBid.updateMany({
      where: {
        loadId: bid.loadId,
        status: LoadBidStatus.PENDING,
        id: { not: bid.id },
      },
      data: { status: LoadBidStatus.DECLINED, reviewedAt: now, reviewedByUserId: args.reviewedByUserId },
    });

    const booking = await tx.booking.create({
      data: {
        loadId: bid.loadId,
        carrierCompanyId: bid.carrierCompanyId,
        agreedCurrency: bid.currency,
        agreedRateUsd: bid.amountUsd,
      },
    });

    await tx.load.update({
      where: { id: bid.loadId },
      data: { status: LoadStatus.BOOKED },
    });

    return { bidId: bid.id, booking };
  });
}

export async function declineLoadBid(args: {
  bidId: string;
  reviewedByUserId: string;
  shipperCompanyId: string;
}) {
  await expireStaleBids();

  const bid = await prisma.loadBid.findUnique({
    where: { id: args.bidId },
    include: { load: { select: { shipperCompanyId: true } } },
  });
  if (!bid) throw new LoadBidError("Bid not found.", 404);
  if (bid.load.shipperCompanyId !== args.shipperCompanyId) {
    throw new LoadBidError("You can only decline bids on your own loads.", 403);
  }
  if (bid.status !== LoadBidStatus.PENDING) {
    throw new LoadBidError("This bid is no longer pending.", 409);
  }

  return prisma.loadBid.update({
    where: { id: bid.id },
    data: {
      status: LoadBidStatus.DECLINED,
      reviewedAt: new Date(),
      reviewedByUserId: args.reviewedByUserId,
    },
  });
}

export async function withdrawLoadBid(args: { bidId: string; carrierCompanyId: string }) {
  await expireStaleBids();

  const bid = await prisma.loadBid.findUnique({
    where: { id: args.bidId },
    select: { id: true, status: true, carrierCompanyId: true },
  });
  if (!bid) throw new LoadBidError("Bid not found.", 404);
  if (bid.carrierCompanyId !== args.carrierCompanyId) {
    throw new LoadBidError("You can only withdraw your own bids.", 403);
  }
  if (bid.status !== LoadBidStatus.PENDING) {
    throw new LoadBidError("This bid is no longer pending.", 409);
  }

  return prisma.loadBid.update({
    where: { id: bid.id },
    data: { status: LoadBidStatus.WITHDRAWN },
  });
}
