import { LoadNoticeChannel, LoadNoticeStatus, type Prisma } from "@prisma/client";

type Db = Prisma.TransactionClient | import("@prisma/client").PrismaClient;

/**
 * Supplier in-app notice (delivered) plus an EMAIL row left PENDING until outbound mail is live.
 */
export async function queueShipperLoadAlerts(
  db: Db,
  args: {
    loadId: string;
    companyId: string;
    kind: string;
    title: string;
    body: string;
  },
) {
  const users = await db.user.findMany({
    where: { companyId: args.companyId, role: "SHIPPER" },
    select: { id: true },
    take: 20,
  });
  const recipientIds: (string | null)[] = users.length ? users.map((u) => u.id) : [null];

  for (const recipientUserId of recipientIds) {
    await db.shipperLoadAlert.create({
      data: {
        loadId: args.loadId,
        companyId: args.companyId,
        recipientUserId,
        kind: args.kind,
        title: args.title,
        body: args.body,
        channel: LoadNoticeChannel.IN_APP,
        status: LoadNoticeStatus.DELIVERED,
      },
    });
    await db.shipperLoadAlert.create({
      data: {
        loadId: args.loadId,
        companyId: args.companyId,
        recipientUserId,
        kind: args.kind,
        title: args.title,
        body: args.body,
        channel: LoadNoticeChannel.EMAIL,
        status: LoadNoticeStatus.PENDING,
      },
    });
  }
}

/**
 * Carrier notices for a booked load: IN_APP now, EMAIL queued for later SMTP.
 */
export async function queueCarrierLoadNotices(
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

  const recipients =
    users.length > 0
      ? users.map((u) => ({ recipientUserId: u.id, recipientEmail: u.email }))
      : [{ recipientUserId: null as string | null, recipientEmail: null as string | null }];

  const changes = args.changes as Prisma.InputJsonValue | undefined;
  const rows = recipients.flatMap((r) => [
    {
      loadId: args.loadId,
      carrierCompanyId: args.carrierCompanyId,
      recipientUserId: r.recipientUserId,
      recipientEmail: r.recipientEmail,
      title: args.title,
      summary: args.summary,
      changes,
      channel: LoadNoticeChannel.IN_APP,
      status: LoadNoticeStatus.DELIVERED,
    },
    {
      loadId: args.loadId,
      carrierCompanyId: args.carrierCompanyId,
      recipientUserId: r.recipientUserId,
      recipientEmail: r.recipientEmail,
      title: args.title,
      summary: args.summary,
      changes,
      channel: LoadNoticeChannel.EMAIL,
      status: LoadNoticeStatus.PENDING,
    },
  ]);

  await db.loadChangeNotice.createMany({ data: rows });
  return { queued: recipients.length };
}
