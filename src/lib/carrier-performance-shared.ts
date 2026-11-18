/** Client-safe carrier performance helpers (no Prisma / Node builtins). */

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

export function formatCoverageUsd(amount: number | null | undefined): string {
  if (amount == null || !Number.isFinite(amount) || amount <= 0) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}
