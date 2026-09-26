import { LoadNoticeChannel } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { getActorContext } from "@/lib/request-context";

const bodySchema = z.object({
  id: z.string().min(1).optional(),
  source: z.enum(["SHIPPER_ALERT", "CARRIER_NOTICE"]).optional(),
  all: z.boolean().optional(),
});

/**
 * Mark one in-app notice read, or all unread notices for this user/company.
 */
export async function POST(req: Request) {
  const actor = await getActorContext();
  if (!actor.userId || !actor.companyId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const now = new Date();

  if (parsed.data.all) {
    const [shipper, carrier] = await Promise.all([
      prisma.shipperLoadAlert.updateMany({
        where: {
          companyId: actor.companyId,
          channel: LoadNoticeChannel.IN_APP,
          resolvedAt: null,
          OR: [{ recipientUserId: actor.userId }, { recipientUserId: null }],
        },
        data: { resolvedAt: now, status: "DELIVERED" },
      }),
      prisma.loadChangeNotice.updateMany({
        where: {
          carrierCompanyId: actor.companyId,
          channel: LoadNoticeChannel.IN_APP,
          readAt: null,
          OR: [{ recipientUserId: actor.userId }, { recipientUserId: null }],
        },
        data: { readAt: now },
      }),
    ]);
    return NextResponse.json({ data: { marked: shipper.count + carrier.count } });
  }

  if (!parsed.data.id || !parsed.data.source) {
    return NextResponse.json({ error: "Pass id + source, or all: true." }, { status: 400 });
  }

  if (parsed.data.source === "SHIPPER_ALERT") {
    const row = await prisma.shipperLoadAlert.findFirst({
      where: {
        id: parsed.data.id,
        companyId: actor.companyId,
        channel: LoadNoticeChannel.IN_APP,
      },
      select: { id: true },
    });
    if (!row) return NextResponse.json({ error: "Notice not found." }, { status: 404 });
    await prisma.shipperLoadAlert.update({
      where: { id: row.id },
      data: { resolvedAt: now, status: "DELIVERED" },
    });
  } else {
    const row = await prisma.loadChangeNotice.findFirst({
      where: {
        id: parsed.data.id,
        carrierCompanyId: actor.companyId,
        channel: LoadNoticeChannel.IN_APP,
      },
      select: { id: true },
    });
    if (!row) return NextResponse.json({ error: "Notice not found." }, { status: 404 });
    await prisma.loadChangeNotice.update({
      where: { id: row.id },
      data: { readAt: now },
    });
  }

  return NextResponse.json({ data: { marked: 1 } });
}
