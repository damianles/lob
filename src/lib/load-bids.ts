import { LoadBidStatus, LoadRateMode, LoadStatus, NotificationEvent, PostedLaneOutcome, type Prisma } from "@prisma/client";

import { enqueueExpiredBidNotices, enqueueLoadNotification } from "@/lib/notifications/dispatch";
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
  const stale = await db.loadBid.findMany({
    where: {
      status: LoadBidStatus.PENDING,
      OR: [{ expiresAt: { lte: now } }, { load: { bidWindowExpiresAt: { lte: now } } }],
    },
    select: {
      id: true,
      loadId: true,
      carrierCompanyId: true,
      kind: true,
      amountUsd: true,
      currency: true,
    },
    orderBy: { expiresAt: "asc" },
    take: 100,
  });
  if (stale.length === 0) return stale;

  await db.loadBid.updateMany({
    where: { id: { in: stale.map((bid) => bid.id) }, status: LoadBidStatus.PENDING },
    data: { status: LoadBidStatus.EXPIRED },
  });

  if (!tx) enqueueExpiredBidNotices(stale);
  return stale;
}

export async function acceptLoadBid(args: {
  bidId: string;
  reviewedByUserId: string;
  shipperCompanyId: string;
  suppressNotifications?: boolean;
}) {
  const outcome = await prisma.$transaction(async (tx) => {
    const expired = await expireStaleBids(tx);

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

    const declined = await tx.loadBid.findMany({
      where: {
        loadId: bid.loadId,
        status: LoadBidStatus.PENDING,
        id: { not: bid.id },
      },
      select: { id: true, carrierCompanyId: true, kind: true },
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

    await tx.laneRateObservation.updateMany({
      where: { loadId: bid.loadId },
      data: {
        bookedRateUsd: bid.amountUsd,
        bookedAt: now,
        outcome: PostedLaneOutcome.BOOKED,
      },
    });

    return {
      bidId: bid.id,
      booking,
      expired,
      declined,
      acceptedKind: bid.kind,
      carrierCompanyId: bid.carrierCompanyId,
      loadId: bid.loadId,
      amountUsd: bid.amountUsd,
      currency: bid.currency,
    };
  });

  const suppress = args.suppressNotifications;
  enqueueExpiredBidNotices(outcome.expired, { suppress });
  const acceptedEvent =
    outcome.acceptedKind === "COUNTER" ? NotificationEvent.COUNTER_ACCEPTED : NotificationEvent.BID_ACCEPTED;
  const amount = Number(outcome.amountUsd);
  const money = Number.isFinite(amount) ? `${amount.toFixed(2)} ${outcome.currency}` : null;
  enqueueLoadNotification({
    loadId: outcome.loadId,
    to: "carrier",
    carrierCompanyId: outcome.carrierCompanyId,
    event: acceptedEvent,
    dedupeKey: `bid-accepted:${outcome.bidId}`,
    headline: outcome.acceptedKind === "COUNTER" ? "Your counter was accepted." : "Your bid was accepted.",
    detail: money,
    suppress,
  });
  enqueueLoadNotification({
    loadId: outcome.loadId,
    to: "shipper",
    event: NotificationEvent.LOAD_BOOKED,
    dedupeKey: `load-booked:shipper:${outcome.loadId}`,
    headline: "A carrier booked your load.",
    detail: money,
    excludeUserId: args.reviewedByUserId,
    suppress,
  });
  for (const other of outcome.declined) {
    enqueueLoadNotification({
      loadId: outcome.loadId,
      to: "carrier",
      carrierCompanyId: other.carrierCompanyId,
      event: other.kind === "COUNTER" ? NotificationEvent.COUNTER_DECLINED : NotificationEvent.BID_DECLINED,
      dedupeKey: `bid-declined:${other.id}`,
      headline: other.kind === "COUNTER" ? "Your counter was declined." : "Your bid was declined.",
      suppress,
    });
  }

  return { bidId: outcome.bidId, booking: outcome.booking };
}

export async function declineLoadBid(args: {
  bidId: string;
  reviewedByUserId: string;
  shipperCompanyId: string;
  suppressNotifications?: boolean;
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

  const updated = await prisma.loadBid.update({
    where: { id: bid.id },
    data: {
      status: LoadBidStatus.DECLINED,
      reviewedAt: new Date(),
      reviewedByUserId: args.reviewedByUserId,
    },
  });

  const amount = Number(updated.amountUsd);
  enqueueLoadNotification({
    loadId: updated.loadId,
    to: "carrier",
    carrierCompanyId: updated.carrierCompanyId,
    event: updated.kind === "COUNTER" ? NotificationEvent.COUNTER_DECLINED : NotificationEvent.BID_DECLINED,
    dedupeKey: `bid-declined:${updated.id}`,
    headline: updated.kind === "COUNTER" ? "Your counter was declined." : "Your bid was declined.",
    detail: Number.isFinite(amount) ? `${amount.toFixed(2)} ${updated.currency}` : null,
    suppress: args.suppressNotifications,
  });

  return updated;
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

/** Bids waiting on this company: mill inbox, or this carrier's pending submissions. */
export async function countPendingBidInbox(args: { companyId: string; asShipper: boolean }) {
  if (args.asShipper) {
    return prisma.loadBid.count({
      where: {
        status: LoadBidStatus.PENDING,
        load: {
          shipperCompanyId: args.companyId,
          status: LoadStatus.POSTED,
          OR: [{ rateMode: LoadRateMode.OPEN_BID }, { rateMode: LoadRateMode.TAKE_IT, allowCounterOffers: true }],
        },
      },
    });
  }
  return prisma.loadBid.count({
    where: { carrierCompanyId: args.companyId, status: LoadBidStatus.PENDING },
  });
}
