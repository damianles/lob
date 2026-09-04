import {
  LoadNoticeChannel,
  LoadNoticeStatus,
  LoadRateMode,
  LoadStatus,
  PostedLaneOutcome,
  type Prisma,
} from "@prisma/client";

import { BID_ACCEPT_HOURS, MAX_BID_WINDOW_HOURS, MAX_OPEN_BID_CYCLES, boardCutoffForRateMode } from "@/lib/board-visibility";
import { prisma } from "@/lib/prisma";
import { parseRequestedPickupAt } from "@/lib/parse-pickup-date";

export class LoadLifecycleError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "LoadLifecycleError";
  }
}

async function createShipperAlerts(args: {
  tx: Prisma.TransactionClient;
  loadId: string;
  companyId: string;
  kind: string;
  title: string;
  body: string;
}) {
  const users = await args.tx.user.findMany({
    where: { companyId: args.companyId, role: "SHIPPER" },
    select: { id: true },
    take: 20,
  });
  const recipientIds: (string | null)[] = users.length ? users.map((u) => u.id) : [null];

  for (const recipientUserId of recipientIds) {
    await args.tx.shipperLoadAlert.create({
      data: {
        loadId: args.loadId,
        companyId: args.companyId,
        recipientUserId,
        kind: args.kind,
        title: args.title,
        body: args.body,
        channel: LoadNoticeChannel.IN_APP,
        status: LoadNoticeStatus.DELIVERED,
      },
    });
    await args.tx.shipperLoadAlert.create({
      data: {
        loadId: args.loadId,
        companyId: args.companyId,
        recipientUserId,
        kind: args.kind,
        title: args.title,
        body: args.body,
        channel: LoadNoticeChannel.EMAIL,
        status: LoadNoticeStatus.PENDING,
      },
    });
  }
}

/**
 * Firm Rate POSTED past 7-day board grace → NEEDS_REPOST + in-app (and email-pending) alerts.
 */
export async function sweepExpiredFirmRates(tx?: Prisma.TransactionClient) {
  const db = tx ?? prisma;
  const cutoff = boardCutoffForRateMode(LoadRateMode.TAKE_IT);
  const now = new Date();

  const stale = await db.load.findMany({
    where: {
      status: LoadStatus.POSTED,
      rateMode: LoadRateMode.TAKE_IT,
      requestedPickupAt: { lt: cutoff },
      booking: { is: null },
    },
    select: {
      id: true,
      referenceNumber: true,
      shipperCompanyId: true,
      originCity: true,
      destinationCity: true,
    },
    take: 100,
  });

  for (const load of stale) {
    await db.load.update({
      where: { id: load.id },
      data: { status: LoadStatus.NEEDS_REPOST, needsRepostAt: now },
    });
    await createShipperAlerts({
      tx: db,
      loadId: load.id,
      companyId: load.shipperCompanyId,
      kind: "FIRM_RATE_EXPIRED",
      title: `Repost needed: ${load.referenceNumber}`,
      body: `${load.referenceNumber} (${load.originCity} → ${load.destinationCity}) is 7+ days past pickup and is off the board. Accept to set new future dates, or decline to unlist it.`,
    });
  }

  return stale.length;
}

/**
 * Open bid window ended:
 * - cycle 1 → NEEDS_REPOST (shipper may reopen one more 72h cycle)
 * - cycle 2 → UNLISTED + warning alerts
 */
export async function sweepExpiredBidWindows(tx?: Prisma.TransactionClient) {
  const db = tx ?? prisma;
  const now = new Date();

  const expired = await db.load.findMany({
    where: {
      status: LoadStatus.POSTED,
      rateMode: LoadRateMode.OPEN_BID,
      bidWindowExpiresAt: { lte: now },
      booking: { is: null },
    },
    select: {
      id: true,
      referenceNumber: true,
      shipperCompanyId: true,
      bidCycleCount: true,
      originCity: true,
      destinationCity: true,
    },
    take: 100,
  });

  for (const load of expired) {
    if (load.bidCycleCount >= MAX_OPEN_BID_CYCLES) {
      await db.load.update({
        where: { id: load.id },
        data: { status: LoadStatus.UNLISTED, needsRepostAt: now },
      });
      await db.loadBid.updateMany({
        where: { loadId: load.id, status: "PENDING" },
        data: { status: "EXPIRED" },
      });
      await db.laneRateObservation.updateMany({
        where: { loadId: load.id },
        data: { outcome: PostedLaneOutcome.BID_CYCLE_REMOVED },
      });
      await createShipperAlerts({
        tx: db,
        loadId: load.id,
        companyId: load.shipperCompanyId,
        kind: "BID_CYCLES_EXHAUSTED",
        title: `Removed after 2 bid cycles: ${load.referenceNumber}`,
        body: `${load.referenceNumber} ran two Open bid windows without a book and was removed from the board. History and posted price are retained.`,
      });
    } else {
      await db.load.update({
        where: { id: load.id },
        data: { status: LoadStatus.NEEDS_REPOST, needsRepostAt: now },
      });
      await db.loadBid.updateMany({
        where: { loadId: load.id, status: "PENDING" },
        data: { status: "EXPIRED" },
      });
      await createShipperAlerts({
        tx: db,
        loadId: load.id,
        companyId: load.shipperCompanyId,
        kind: "BID_WINDOW_ENDED",
        title: `Bid window ended: ${load.referenceNumber}`,
        body: `${load.referenceNumber} Open bid window closed (cycle ${load.bidCycleCount} of ${MAX_OPEN_BID_CYCLES}). Repost for another ${MAX_BID_WINDOW_HOURS}h cycle, or remove the load.`,
      });
    }
  }

  return expired.length;
}

/** Run both sweeps (idempotent enough for request-path use). */
export async function sweepLoadLifecycle() {
  const firm = await sweepExpiredFirmRates();
  const bids = await sweepExpiredBidWindows();
  return { firm, bids };
}

export async function listNeedsRepostForCompany(companyId: string) {
  await sweepLoadLifecycle();
  return prisma.load.findMany({
    where: { shipperCompanyId: companyId, status: LoadStatus.NEEDS_REPOST },
    orderBy: { needsRepostAt: "desc" },
    select: {
      id: true,
      referenceNumber: true,
      rateMode: true,
      bidCycleCount: true,
      originCity: true,
      originState: true,
      destinationCity: true,
      destinationState: true,
      requestedPickupAt: true,
      requestedDeliveryAt: true,
      offeredRateUsd: true,
      offerCurrency: true,
      needsRepostAt: true,
    },
    take: 50,
  });
}

export async function resolveNeedsRepost(args: {
  loadId: string;
  shipperCompanyId: string;
  userId: string;
  decision: "ACCEPT" | "DECLINE";
  /** Required when ACCEPT for Firm Rate / always for date refresh */
  pickupAt?: string;
  deliveryAt?: string;
}) {
  return prisma.$transaction(async (tx) => {
    await sweepExpiredFirmRates(tx);
    await sweepExpiredBidWindows(tx);

    const load = await tx.load.findUnique({
      where: { id: args.loadId },
      select: {
        id: true,
        status: true,
        shipperCompanyId: true,
        rateMode: true,
        bidCycleCount: true,
        referenceNumber: true,
      },
    });
    if (!load) throw new LoadLifecycleError("Load not found.", 404);
    if (load.shipperCompanyId !== args.shipperCompanyId) {
      throw new LoadLifecycleError("Not your load.", 403);
    }
    if (load.status !== LoadStatus.NEEDS_REPOST) {
      throw new LoadLifecycleError("This load does not need resolution.", 409);
    }

    if (args.decision === "DECLINE") {
      await tx.load.update({
        where: { id: load.id },
        data: { status: LoadStatus.UNLISTED },
      });
      await tx.laneRateObservation.updateMany({
        where: { loadId: load.id },
        data: { outcome: PostedLaneOutcome.DECLINED_REPOST },
      });
      await tx.shipperLoadAlert.updateMany({
        where: { loadId: load.id, channel: LoadNoticeChannel.IN_APP, resolvedAt: null },
        data: { resolvedAt: new Date(), status: LoadNoticeStatus.DELIVERED },
      });
      return { id: load.id, status: LoadStatus.UNLISTED };
    }

    const pickup = args.pickupAt ? parseRequestedPickupAt(args.pickupAt) : null;
    const delivery = args.deliveryAt ? parseRequestedPickupAt(args.deliveryAt) : null;
    if (!pickup) throw new LoadLifecycleError("Future pickup date is required.", 400);
    if (pickup.getTime() < Date.now() - 60_000) {
      throw new LoadLifecycleError("Pickup date must be in the future.", 400);
    }
    if (delivery && delivery.getTime() < pickup.getTime()) {
      throw new LoadLifecycleError("Delivery must be on or after pickup.", 400);
    }

    const now = new Date();
    const isOpenBid = load.rateMode === LoadRateMode.OPEN_BID;
    const nextCycle = isOpenBid ? load.bidCycleCount + 1 : load.bidCycleCount;
    if (isOpenBid && nextCycle > MAX_OPEN_BID_CYCLES) {
      throw new LoadLifecycleError(
        `This load already used ${MAX_OPEN_BID_CYCLES} bid cycles and cannot be reopened.`,
        409,
      );
    }

    await tx.load.update({
      where: { id: load.id },
      data: {
        status: LoadStatus.POSTED,
        needsRepostAt: null,
        requestedPickupAt: pickup,
        requestedDeliveryAt: delivery ?? undefined,
        bidCycleCount: nextCycle,
        bidWindowExpiresAt: isOpenBid
          ? new Date(now.getTime() + MAX_BID_WINDOW_HOURS * 60 * 60 * 1000)
          : null,
      },
    });

    await tx.shipperLoadAlert.updateMany({
      where: { loadId: load.id, channel: LoadNoticeChannel.IN_APP, resolvedAt: null },
      data: { resolvedAt: now, status: LoadNoticeStatus.DELIVERED },
    });

    return {
      id: load.id,
      status: LoadStatus.POSTED,
      bidCycleCount: nextCycle,
      bidWindowExpiresAt: isOpenBid
        ? new Date(now.getTime() + MAX_BID_WINDOW_HOURS * 60 * 60 * 1000)
        : null,
    };
  });
}

export function computeBidAcceptExpiresAt(args: {
  now?: Date;
  bidWindowExpiresAt: Date | null;
}): Date {
  const now = args.now ?? new Date();
  const acceptEnd = new Date(now.getTime() + BID_ACCEPT_HOURS * 60 * 60 * 1000);
  if (args.bidWindowExpiresAt && args.bidWindowExpiresAt.getTime() < acceptEnd.getTime()) {
    return args.bidWindowExpiresAt;
  }
  return acceptEnd;
}
