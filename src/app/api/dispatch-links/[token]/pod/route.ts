import { NextResponse } from "next/server";
import { DispatchLinkStatus, LoadStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { podUploadSchema } from "@/lib/validation";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const body = await req.json();
  const parsed = podUploadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const dispatchLink = await prisma.dispatchLink.findUnique({
    where: { token },
    include: { load: true },
  });

  if (!dispatchLink || dispatchLink.status !== DispatchLinkStatus.ACTIVE) {
    return NextResponse.json({ error: "Dispatch link is invalid or inactive." }, { status: 404 });
  }

  if (!dispatchLink.pickupConfirmedAt) {
    return NextResponse.json({ error: "Pickup must be confirmed before delivery." }, { status: 409 });
  }

  if (dispatchLink.expiresAt < new Date()) {
    await prisma.dispatchLink.update({
      where: { id: dispatchLink.id },
      data: { status: DispatchLinkStatus.EXPIRED },
    });
    return NextResponse.json({ error: "Dispatch link has expired." }, { status: 410 });
  }

  const now = new Date();
  const updated = await prisma.$transaction(async (tx) => {
    if (parsed.data.fileUrl) {
      await tx.document.create({
        data: {
          dispatchLinkId: dispatchLink.id,
          kind: "POD",
          fileUrl: parsed.data.fileUrl,
        },
      });
    } else if (parsed.data.receiverAcknowledged) {
      await tx.document.create({
        data: {
          dispatchLinkId: dispatchLink.id,
          kind: "RECEIVER_ACK",
          fileUrl: "https://lumberoneboard.com/internal/receiver-acknowledged",
        },
      });
    }

    await tx.dispatchLink.update({
      where: { id: dispatchLink.id },
      data: {
        deliveredAt: now,
        status: DispatchLinkStatus.COMPLETED,
      },
    });

    await tx.load.update({
      where: { id: dispatchLink.loadId },
      data: { status: LoadStatus.DELIVERED },
    });

    return tx.dispatchLink.findUnique({
      where: { id: dispatchLink.id },
      include: { load: true, podDocument: true },
    });
  });

  return NextResponse.json({ data: updated });
}

