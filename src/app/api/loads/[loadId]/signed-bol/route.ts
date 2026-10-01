import { DispatchLinkStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getActorContext } from "@/lib/request-context";
import { signedBolUploadSchema } from "@/lib/validation";

export async function POST(req: Request, ctx: { params: Promise<{ loadId: string }> }) {
  const actor = await getActorContext();
  if (!actor.userId || !actor.companyId || actor.role !== "DISPATCHER") {
    return NextResponse.json({ error: "Carrier accounts only." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = signedBolUploadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { loadId } = await ctx.params;
  const load = await prisma.load.findUnique({
    where: { id: loadId },
    select: {
      booking: { select: { carrierCompanyId: true } },
      dispatchLink: {
        select: {
          id: true,
          status: true,
          pickupConfirmedAt: true,
          expiresAt: true,
        },
      },
    },
  });
  if (!load) {
    return NextResponse.json({ error: "Load not found." }, { status: 404 });
  }
  if (!load.booking || load.booking.carrierCompanyId !== actor.companyId) {
    return NextResponse.json({ error: "You can only attach a BOL on loads you booked." }, { status: 403 });
  }
  if (!load.dispatchLink) {
    return NextResponse.json({ error: "Create a dispatch link before attaching a signed BOL." }, { status: 409 });
  }
  if (
    load.dispatchLink.status !== DispatchLinkStatus.ACTIVE &&
    load.dispatchLink.status !== DispatchLinkStatus.COMPLETED
  ) {
    return NextResponse.json({ error: "Dispatch link is invalid or inactive." }, { status: 404 });
  }
  if (!load.dispatchLink.pickupConfirmedAt) {
    return NextResponse.json({ error: "Mark pickup before attaching the signed BOL." }, { status: 409 });
  }

  const now = new Date();
  const updated = await prisma.dispatchLink.update({
    where: { id: load.dispatchLink.id },
    data: {
      signedBolFileUrl: parsed.data.fileUrl,
      signedBolUploadedAt: now,
    },
  });

  return NextResponse.json({ data: updated });
}
