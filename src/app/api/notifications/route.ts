import { LoadNoticeChannel } from "@prisma/client";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getActorContext } from "@/lib/request-context";

export type AppNotification = {
  id: string;
  source: "SHIPPER_ALERT" | "CARRIER_NOTICE";
  title: string;
  body: string;
  loadId: string;
  createdAt: string;
  unread: boolean;
  href: string;
};

/**
 * In-app inbox for the signed-in company: mill alerts + carrier load notices.
 */
export async function GET() {
  const actor = await getActorContext();
  if (!actor.userId || !actor.companyId) {
    return NextResponse.json({ data: [], unreadCount: 0 }, { status: 401 });
  }

  const [shipperRows, carrierRows] = await Promise.all([
    prisma.shipperLoadAlert.findMany({
      where: {
        companyId: actor.companyId,
        channel: LoadNoticeChannel.IN_APP,
        OR: [{ recipientUserId: actor.userId }, { recipientUserId: null }],
      },
      orderBy: { createdAt: "desc" },
      take: 40,
      select: {
        id: true,
        title: true,
        body: true,
        loadId: true,
        createdAt: true,
        resolvedAt: true,
      },
    }),
    prisma.loadChangeNotice.findMany({
      where: {
        carrierCompanyId: actor.companyId,
        channel: LoadNoticeChannel.IN_APP,
        OR: [{ recipientUserId: actor.userId }, { recipientUserId: null }],
      },
      orderBy: { createdAt: "desc" },
      take: 40,
      select: {
        id: true,
        title: true,
        summary: true,
        loadId: true,
        createdAt: true,
        readAt: true,
      },
    }),
  ]);

  const data: AppNotification[] = [
    ...shipperRows.map((r) => ({
      id: r.id,
      source: "SHIPPER_ALERT" as const,
      title: r.title,
      body: r.body,
      loadId: r.loadId,
      createdAt: r.createdAt.toISOString(),
      unread: r.resolvedAt == null,
      href: `/loads/${r.loadId}`,
    })),
    ...carrierRows.map((r) => ({
      id: r.id,
      source: "CARRIER_NOTICE" as const,
      title: r.title,
      body: r.summary,
      loadId: r.loadId,
      createdAt: r.createdAt.toISOString(),
      unread: r.readAt == null,
      href: `/loads/${r.loadId}`,
    })),
  ].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  const unreadCount = data.filter((n) => n.unread).length;
  return NextResponse.json({ data: data.slice(0, 40), unreadCount });
}
