import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { LoadStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getActorContext } from "@/lib/request-context";
import { createDispatchSchema } from "@/lib/validation";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ loadId: string }> },
) {
  const actor = await getActorContext();
  if (!actor.userId || !actor.companyId) {
    return NextResponse.json({ error: "Sign in and complete onboarding to dispatch." }, { status: 401 });
  }
  if (actor.role !== "DISPATCHER" && actor.role !== "ADMIN") {
    return NextResponse.json({ error: "Only carrier dispatchers can assign drivers." }, { status: 403 });
  }

  const { loadId } = await ctx.params;
  const body = await req.json();
  const parsed = createDispatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const assignedByUserId = parsed.data.assignedByUserId ?? actor.userId;
  if (assignedByUserId !== actor.userId) {
    return NextResponse.json({ error: "You can only assign dispatch under your own user." }, { status: 403 });
  }

  const load = await prisma.load.findUnique({ where: { id: loadId }, include: { booking: true } });
  if (!load) {
    return NextResponse.json({ error: "Load not found." }, { status: 404 });
  }
  if (!load.booking) {
    return NextResponse.json({ error: "Load must be booked before dispatch assignment." }, { status: 409 });
  }
  if (load.booking.carrierCompanyId !== actor.companyId && actor.role !== "ADMIN") {
    return NextResponse.json({ error: "Only the booked carrier can create a driver link." }, { status: 403 });
  }

  const token = randomUUID().replaceAll("-", "");
  const expiresAt = new Date(Date.now() + parsed.data.expiresInHours * 60 * 60 * 1000);

  const dispatch = await prisma.$transaction(async (tx) => {
    const created = await tx.dispatchLink.create({
      data: {
        loadId,
        token,
        driverName: parsed.data.driverName,
        driverPhone: parsed.data.driverPhone,
        driverEmail: parsed.data.driverEmail,
        assignedByUserId,
        expiresAt,
      },
    });

    await tx.load.update({
      where: { id: loadId },
      data: { status: LoadStatus.ASSIGNED },
    });

    return created;
  });

  return NextResponse.json(
    {
      data: dispatch,
      driverViewUrl: `/driver/${dispatch.token}`,
    },
    { status: 201 },
  );
}

