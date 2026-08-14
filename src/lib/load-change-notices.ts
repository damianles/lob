import type { Prisma, PrismaClient } from "@prisma/client";
import { LoadNoticeChannel, LoadNoticeStatus } from "@prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * Queue notices for every user on the booked carrier company.
 * Email sending is deferred — EMAIL rows stay PENDING for later SMTP/manual workflows.
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
  const users = await db.user.findMany({
    where: { companyId: args.carrierCompanyId },
    select: { id: true, email: true },
    take: 50,
  });

  if (users.length === 0) {
    await db.loadChangeNotice.create({
      data: {
        loadId: args.loadId,
        carrierCompanyId: args.carrierCompanyId,
        title: args.title,
        summary: args.summary,
        changes: args.changes as Prisma.InputJsonValue | undefined,
        channel: LoadNoticeChannel.EMAIL,
        status: LoadNoticeStatus.PENDING,
      },
    });
    return { queued: 1 };
  }

  await db.loadChangeNotice.createMany({
    data: users.map((u) => ({
      loadId: args.loadId,
      carrierCompanyId: args.carrierCompanyId,
      recipientUserId: u.id,
      recipientEmail: u.email,
      title: args.title,
      summary: args.summary,
      changes: args.changes as Prisma.InputJsonValue | undefined,
      channel: LoadNoticeChannel.EMAIL,
      status: LoadNoticeStatus.PENDING,
    })),
  });

  return { queued: users.length };
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
