import { LoadStatus } from "@prisma/client";

import { endOfUtcDay } from "@/lib/carrier-insurance";
import { prisma } from "@/lib/prisma";

/** Hide rate % until this many completed observations. */
export const CARRIER_PERF_MIN_SAMPLE = 3;

export type CarrierPerformanceStats = {
  bookedCount: number;
  deliveredCount: number;
  /** delivered / booked when booked >= min sample; else null. */
  deliveryRatePct: number | null;
  onTimePickupSample: number;
  onTimePickupPct: number | null;
  onTimeDeliverySample: number;
  onTimeDeliveryPct: number | null;
};

function sameOrBeforeUtcDay(eventAt: Date, dueAt: Date): boolean {
  return eventAt.getTime() <= endOfUtcDay(dueAt).getTime();
}

function pct(ok: number, sample: number): number | null {
  if (sample < CARRIER_PERF_MIN_SAMPLE) return null;
  return Math.round((ok / sample) * 100);
}

/**
 * Marketplace performance from LOB check-ins (not GPS).
 * On-time = carrier check-in at or before end of the requested UTC calendar day.
 */
export async function getCarrierPerformanceStats(
  carrierCompanyId: string,
): Promise<CarrierPerformanceStats> {
  const bookings = await prisma.booking.findMany({
    where: { carrierCompanyId },
    select: {
      id: true,
      load: {
        select: {
          status: true,
          requestedPickupAt: true,
          requestedDeliveryAt: true,
          dispatchLink: {
            select: {
              pickupConfirmedAt: true,
              deliveredAt: true,
              supplierDeliveredAt: true,
            },
          },
        },
      },
    },
  });

  const bookedCount = bookings.length;
  let deliveredCount = 0;
  let pickupOk = 0;
  let pickupSample = 0;
  let deliveryOk = 0;
  let deliverySample = 0;

  for (const b of bookings) {
    const load = b.load;
    const dispatch = load.dispatchLink;
    const delivered =
      load.status === LoadStatus.DELIVERED ||
      Boolean(dispatch?.deliveredAt && dispatch?.supplierDeliveredAt);
    if (delivered) deliveredCount += 1;

    if (dispatch?.pickupConfirmedAt) {
      pickupSample += 1;
      if (sameOrBeforeUtcDay(dispatch.pickupConfirmedAt, load.requestedPickupAt)) {
        pickupOk += 1;
      }
    }

    if (dispatch?.deliveredAt && load.requestedDeliveryAt) {
      deliverySample += 1;
      if (sameOrBeforeUtcDay(dispatch.deliveredAt, load.requestedDeliveryAt)) {
        deliveryOk += 1;
      }
    }
  }

  return {
    bookedCount,
    deliveredCount,
    deliveryRatePct: pct(deliveredCount, bookedCount),
    onTimePickupSample: pickupSample,
    onTimePickupPct: pct(pickupOk, pickupSample),
    onTimeDeliverySample: deliverySample,
    onTimeDeliveryPct: pct(deliveryOk, deliverySample),
  };
}

export function formatCoverageUsd(amount: number | null | undefined): string {
  if (amount == null || !Number.isFinite(amount) || amount <= 0) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}
