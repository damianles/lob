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
