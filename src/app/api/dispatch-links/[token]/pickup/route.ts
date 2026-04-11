import { NextResponse } from "next/server";
import { DispatchLinkStatus, LoadStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { pickupConfirmSchema } from "@/lib/validation";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const body = await req.json();
  const parsed = pickupConfirmSchema.safeParse(body);
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

  if (dispatchLink.expiresAt < new Date()) {
    await prisma.dispatchLink.update({
      where: { id: dispatchLink.id },
      data: { status: DispatchLinkStatus.EXPIRED },
    });
    return NextResponse.json({ error: "Dispatch link has expired." }, { status: 410 });
  }

  if (dispatchLink.load.uniquePickupCode !== parsed.data.pickupCode.toUpperCase()) {
    return NextResponse.json({ error: "Pickup code does not match this load." }, { status: 403 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.dispatchLink.update({
      where: { id: dispatchLink.id },
      data: { pickupConfirmedAt: new Date() },
    });

    await tx.load.update({
      where: { id: dispatchLink.loadId },
      data: { status: LoadStatus.IN_TRANSIT },
    });

    return tx.dispatchLink.findUnique({
      where: { id: dispatchLink.id },
      include: { load: true },
    });
  });

  return NextResponse.json({ data: updated });
}

