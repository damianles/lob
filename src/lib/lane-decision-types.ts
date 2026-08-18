export type LaneDecisionContext = {
  currency: "USD" | "CAD";
  marketAvg: number | null;
  sampleCount: number | null;
  matchLevel: "zip" | "city" | "state" | null;
  windowDays: number;
  floor: number | null;
  ceiling: number | null;
  bandEnforced: boolean;
  thinLane: boolean;
  miles: number | null;
  lastBookedRate: number | null;
  lastBookedAt: string | null;
  priorLaneBookings: number;
};

export type RateBandBounds = {
  floor: number;
  ceiling: number;
  bandEnforced: boolean;
};

export function bandSide(
  amount: number,
  band: RateBandBounds | null | undefined,
): "low" | "high" | null {
  if (!band?.bandEnforced || !Number.isFinite(amount)) return null;
  if (amount < band.floor) return "low";
  if (amount > band.ceiling) return "high";
  return null;
}
