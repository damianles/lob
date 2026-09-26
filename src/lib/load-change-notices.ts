import type { Prisma, PrismaClient } from "@prisma/client";

import { queueCarrierLoadNotices } from "@/lib/platform-notices";

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * Queue notices for every user on the booked carrier company.
 * IN_APP is delivered immediately. EMAIL rows stay PENDING until SMTP is live.
 */
export async function queueBookedCarrierChangeNotices(
  db: Db,
  args: {
    loadId: string;
    carrierCompanyId: string;
    title: string;
    summary: string;
    changes?: Record<string, unknown>;
  },
) {
  return queueCarrierLoadNotices(db, args);
}

export function tierUnlockAt(
  postedAt: Date,
  tier: number,
  staging: { enabled: boolean; t1Hours: number; t2Hours: number },
): Date {
  if (!staging.enabled || tier <= 1) return new Date(postedAt);
  const ms =
    tier === 2
      ? staging.t1Hours * 60 * 60 * 1000
      : (staging.t1Hours + staging.t2Hours) * 60 * 60 * 1000;
  return new Date(postedAt.getTime() + ms);
}
