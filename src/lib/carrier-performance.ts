import { LoadStatus } from "@prisma/client";

import { endOfUtcDay } from "@/lib/carrier-insurance";
import {
  CARRIER_PERF_MIN_SAMPLE,
  type CarrierPerformanceStats,
} from "@/lib/carrier-performance-shared";
import { prisma } from "@/lib/prisma";

export {
  CARRIER_PERF_MIN_SAMPLE,
  formatCoverageUsd,
  type CarrierPerformanceStats,
} from "@/lib/carrier-performance-shared";

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
