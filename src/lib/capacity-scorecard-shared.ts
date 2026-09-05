/**
 * Client-safe capacity scorecard types and formatters (no Prisma / Node).
 */

export const CAPACITY_SCORE_WINDOW_DAYS = 90;
/** Hide rates until the carrier has this many accept/decline decisions. */
export const CAPACITY_SCORE_MIN_DECISIONS = 5;
/** Min terminal (delivered/cancelled) capacity books before showing completion %. */
export const CAPACITY_SCORE_MIN_COMPLETIONS = 3;

export type CapacityScoreBand = "excellent" | "good" | "caution" | "new";

/**
 * Anonymous carrier performance from capacity requests.
 * Never includes identity — safe to attach to the open capacity board.
 */
export type CapacityScorecardPublic = {
  sampleSize: number;
  acceptRatePct: number | null;
  medianRespondHours: number | null;
  completionSampleSize: number;
  completionRatePct: number | null;
  band: CapacityScoreBand;
};

export function formatRespondHours(hours: number | null): string | null {
  if (hours == null) return null;
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))}m`;
  if (hours < 24) return `${hours}h`;
  const days = Math.round((hours / 24) * 10) / 10;
  return `${days}d`;
}

export function emptyCapacityScorecard(): CapacityScorecardPublic {
  return {
    sampleSize: 0,
    acceptRatePct: null,
    medianRespondHours: null,
    completionSampleSize: 0,
    completionRatePct: null,
    band: "new",
  };
}
