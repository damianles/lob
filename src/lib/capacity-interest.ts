import { randomUUID } from "node:crypto";
import {
  CapacityInterestStatus,
  LoadBidStatus,
  LoadRateMode,
  LoadStatus,
  OfferCurrency,
  PostedLaneOutcome,
  Prisma,
  RateObservationSource,
} from "@prisma/client";

import { allocateLobReference } from "@/lib/allocate-lob-reference";
import { canonicalCityKey } from "@/lib/city-canonical";
import { inferOfferCurrency } from "@/lib/lane-currency";
import { normalizeEquipmentForBenchmark, zip5ForBenchmark } from "@/lib/market-rate-lane";
import { parseRequestedPickupAt } from "@/lib/parse-pickup-date";
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

export type CapacitySpawnInput = {
  weightLbs: number;
  requestedPickupAt: string;
  requestedDeliveryAt?: string;
  /** Override capacity asking rate when set. */
  offeredRateUsd?: number;
  originCity?: string;
  originState?: string;
  destinationCity?: string;
  destinationState?: string;
};

/**
 * Create a Firm Rate POSTED load from an open capacity lane, then return its id.
 * Used when the mill has no matching posted load and wants to request this truck.
 */
export async function spawnLoadFromCapacity(args: {
  shipperCompanyId: string;
  createdByUserId: string;
  capacity: {
    id: string;
    originZip: string;
    originCity: string | null;
    originState: string | null;
    destinationZip: string;
    destinationCity: string | null;
    destinationState: string | null;
    equipmentType: string;
    askingRateUsd: Prisma.Decimal | number;
    availableFrom: Date;
    availableUntil: Date;
  };
  spawn: CapacitySpawnInput;
}): Promise<{ loadId: string; referenceNumber: string }> {
  const originCity = (args.spawn.originCity?.trim() || args.capacity.originCity?.trim() || "").trim();
  const originState = (args.spawn.originState?.trim() || args.capacity.originState?.trim() || "")
    .trim()
    .toUpperCase()
    .slice(0, 2);
  const destinationCity = (
    args.spawn.destinationCity?.trim() ||
    args.capacity.destinationCity?.trim() ||
    ""
  ).trim();
  const destinationState = (
    args.spawn.destinationState?.trim() ||
    args.capacity.destinationState?.trim() ||
    ""
  )
    .trim()
    .toUpperCase()
    .slice(0, 2);

  if (originCity.length < 2 || originState.length !== 2) {
    throw new CapacityInterestError("Origin city and 2-letter state/province are required to create a load.", 400);
  }
  if (destinationCity.length < 2 || destinationState.length !== 2) {
    throw new CapacityInterestError(
      "Destination city and 2-letter state/province are required to create a load.",
      400,
    );
  }
  if (!Number.isFinite(args.spawn.weightLbs) || args.spawn.weightLbs < 1) {
    throw new CapacityInterestError("Enter a positive weight (lbs).", 400);
  }

  const pickupAt = parseRequestedPickupAt(args.spawn.requestedPickupAt);
  if (!pickupAt) {
    throw new CapacityInterestError("Invalid pickup date.", 400);
  }

  const fromDay = new Date(
    Date.UTC(
      args.capacity.availableFrom.getUTCFullYear(),
      args.capacity.availableFrom.getUTCMonth(),
      args.capacity.availableFrom.getUTCDate(),
    ),
  );
  const untilDay = new Date(
    Date.UTC(
      args.capacity.availableUntil.getUTCFullYear(),
      args.capacity.availableUntil.getUTCMonth(),
      args.capacity.availableUntil.getUTCDate(),
      23,
      59,
      59,
      999,
    ),
  );
  if (pickupAt < fromDay || pickupAt > untilDay) {
    throw new CapacityInterestError("Pickup date must fall inside this capacity’s available window.", 400);
  }

  let deliveryAt: Date | null = null;
  if (args.spawn.requestedDeliveryAt) {
    deliveryAt = parseRequestedPickupAt(args.spawn.requestedDeliveryAt);
    if (!deliveryAt) throw new CapacityInterestError("Invalid delivery date.", 400);
  }

  const rateNative =
    args.spawn.offeredRateUsd != null && Number.isFinite(args.spawn.offeredRateUsd)
      ? args.spawn.offeredRateUsd
      : Number(args.capacity.askingRateUsd);
  if (!(rateNative > 0)) {
    throw new CapacityInterestError("Rate must be positive.", 400);
  }

  const offerCurrency = inferOfferCurrency(originState, destinationState) as OfferCurrency;

  return prisma.$transaction(async (tx) => {
    const referenceNumber = await allocateLobReference(tx, args.shipperCompanyId);
    const row = await tx.load.create({
      data: {
        referenceNumber,
        originCity,
        originState,
        originZip: args.capacity.originZip,
        destinationCity,
        destinationState,
        destinationZip: args.capacity.destinationZip,
        weightLbs: Math.round(args.spawn.weightLbs),
        equipmentType: args.capacity.equipmentType,
        isRush: false,
        isPrivate: true,
        offerCurrency,
        offeredRateUsd: new Prisma.Decimal(rateNative.toFixed(2)),
        rateMode: LoadRateMode.TAKE_IT,
        allowCounterOffers: false,
        shipperCompanyId: args.shipperCompanyId,
        createdByUserId: args.createdByUserId,
        uniquePickupCode: randomUUID().slice(0, 6).toUpperCase(),
        requestedPickupAt: pickupAt,
        requestedDeliveryAt: deliveryAt,
        extendedPosting: {
          capacitySpawn: { capacityOfferId: args.capacity.id },
        },
        laneRateObservation: {
          create: {
            observedAt: new Date(),
            originState,
            destState: destinationState,
            originCityCanon: canonicalCityKey(originCity),
            destCityCanon: canonicalCityKey(destinationCity),
            originZip5: zip5ForBenchmark(args.capacity.originZip),
            destZip5: zip5ForBenchmark(args.capacity.destinationZip),
            equipmentNorm: normalizeEquipmentForBenchmark(args.capacity.equipmentType),
            rateUsd: new Prisma.Decimal(rateNative.toFixed(2)),
            offerCurrency,
            source: RateObservationSource.POSTED,
            outcome: "OPEN",
          },
        },
      },
    });
    return { loadId: row.id, referenceNumber: row.referenceNumber };
  });
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
