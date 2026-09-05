import "server-only";

import { CapacityInterestStatus, LoadStatus } from "@prisma/client";

import {
  CAPACITY_SCORE_MIN_COMPLETIONS,
  CAPACITY_SCORE_MIN_DECISIONS,
  CAPACITY_SCORE_WINDOW_DAYS,
  emptyCapacityScorecard,
  type CapacityScoreBand,
  type CapacityScorecardPublic,
} from "@/lib/capacity-scorecard-shared";
import { prisma } from "@/lib/prisma";

export type { CapacityScoreBand, CapacityScorecardPublic };
export {
  CAPACITY_SCORE_MIN_COMPLETIONS,
  CAPACITY_SCORE_MIN_DECISIONS,
  CAPACITY_SCORE_WINDOW_DAYS,
  formatRespondHours,
} from "@/lib/capacity-scorecard-shared";

function median(nums: number[]): number | null {
  if (nums.length === 0) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Math.round(((sorted[mid - 1]! + sorted[mid]!) / 2) * 10) / 10;
  }
  return Math.round(sorted[mid]! * 10) / 10;
}

function acceptBand(acceptRatePct: number | null, sampleSize: number): CapacityScoreBand {
  if (sampleSize < CAPACITY_SCORE_MIN_DECISIONS || acceptRatePct == null) return "new";
  if (acceptRatePct >= 80) return "excellent";
  if (acceptRatePct >= 60) return "good";
  return "caution";
}

function scoreFromRows(
  rows: Array<{
    status: CapacityInterestStatus;
    createdAt: Date;
    reviewedAt: Date | null;
    loadStatus: LoadStatus;
  }>,
): CapacityScorecardPublic {
  const decided = rows.filter(
    (r) =>
      (r.status === CapacityInterestStatus.ACCEPTED || r.status === CapacityInterestStatus.DECLINED) &&
      r.reviewedAt,
  );
  const accepted = decided.filter((r) => r.status === CapacityInterestStatus.ACCEPTED);
  const sampleSize = decided.length;
  const acceptRatePct =
    sampleSize >= CAPACITY_SCORE_MIN_DECISIONS
      ? Math.round((accepted.length / sampleSize) * 100)
      : null;

  const respondHours = decided
    .map((r) => (r.reviewedAt!.getTime() - r.createdAt.getTime()) / 3_600_000)
    .filter((h) => Number.isFinite(h) && h >= 0);
  const medianRespondHours =
    sampleSize >= CAPACITY_SCORE_MIN_DECISIONS ? median(respondHours) : null;

  const terminal = accepted.filter(
    (r) => r.loadStatus === LoadStatus.DELIVERED || r.loadStatus === LoadStatus.CANCELLED,
  );
  const delivered = terminal.filter((r) => r.loadStatus === LoadStatus.DELIVERED);
  const completionSampleSize = terminal.length;
  const completionRatePct =
    completionSampleSize >= CAPACITY_SCORE_MIN_COMPLETIONS
      ? Math.round((delivered.length / completionSampleSize) * 100)
      : null;

  return {
    sampleSize,
    acceptRatePct,
    medianRespondHours,
    completionSampleSize,
    completionRatePct,
    band: acceptBand(acceptRatePct, sampleSize),
  };
}

/**
 * Batch capacity scorecards for carrier company ids (90-day accept/decline window).
 */
export async function capacityScorecardsForCarriers(
  carrierCompanyIds: string[],
  now = new Date(),
): Promise<Map<string, CapacityScorecardPublic>> {
  const unique = [...new Set(carrierCompanyIds.filter(Boolean))];
  const out = new Map<string, CapacityScorecardPublic>();
  for (const id of unique) out.set(id, emptyCapacityScorecard());
  if (unique.length === 0) return out;

  const since = new Date(now.getTime() - CAPACITY_SCORE_WINDOW_DAYS * 86_400_000);

  const rows = await prisma.capacityInterest.findMany({
    where: {
      carrierCompanyId: { in: unique },
      status: { in: [CapacityInterestStatus.ACCEPTED, CapacityInterestStatus.DECLINED] },
      reviewedAt: { gte: since },
    },
    select: {
      carrierCompanyId: true,
      status: true,
      createdAt: true,
      reviewedAt: true,
      load: { select: { status: true } },
    },
  });

  const byCarrier = new Map<
    string,
    Array<{ status: CapacityInterestStatus; createdAt: Date; reviewedAt: Date | null; loadStatus: LoadStatus }>
  >();
  for (const id of unique) byCarrier.set(id, []);
  for (const r of rows) {
    const list = byCarrier.get(r.carrierCompanyId);
    if (!list) continue;
    list.push({
      status: r.status,
      createdAt: r.createdAt,
      reviewedAt: r.reviewedAt,
      loadStatus: r.load.status,
    });
  }

  for (const [id, list] of byCarrier) {
    out.set(id, scoreFromRows(list));
  }
  return out;
}
