import { NextResponse } from "next/server";
import { z } from "zod";

import { parseDateInputToUtc, validateCapacityAvailabilityWindow } from "@/lib/capacity-window";
import { prisma } from "@/lib/prisma";
import { getActorContext } from "@/lib/request-context";

const bodySchema = z.object({
  availableFrom: z.string().min(10).max(10),
  availableUntil: z.string().min(10).max(10),
});

/** Clone an existing offer with a new availability window; marks the old row EXPIRED. */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const actor = await getActorContext();
  if (!actor.companyId || !actor.userId) {
    return NextResponse.json({ error: "Sign in and link a carrier company." }, { status: 401 });
  }
  if (actor.role !== "DISPATCHER" && actor.role !== "ADMIN") {
    return NextResponse.json({ error: "Carriers only." }, { status: 403 });
  }

  const { id } = await ctx.params;
  const prev = await prisma.capacityOffer.findFirst({
    where: { id, carrierCompanyId: actor.companyId, status: "OPEN" },
  });
  if (!prev) {
    return NextResponse.json({ error: "Capacity post not found." }, { status: 404 });
  }

  const body = await req.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const availableFrom = parseDateInputToUtc(parsed.data.availableFrom, false);
  const availableUntil = parseDateInputToUtc(parsed.data.availableUntil, true);
  if (!availableFrom || !availableUntil) {
    return NextResponse.json({ error: "Use YYYY-MM-DD for availability dates." }, { status: 400 });
  }

  const windowErr = validateCapacityAvailabilityWindow(availableFrom, availableUntil);
  if (windowErr) {
    return NextResponse.json({ error: windowErr }, { status: 400 });
  }

  const created = await prisma.$transaction(async (tx) => {
    await tx.capacityOffer.update({
      where: { id: prev.id },
      data: { status: "EXPIRED" },
    });
    return tx.capacityOffer.create({
      data: {
        carrierCompanyId: prev.carrierCompanyId,
        originZip: prev.originZip,
        originCity: prev.originCity,
        originState: prev.originState,
        destinationZip: prev.destinationZip,
        destinationCity: prev.destinationCity,
        destinationState: prev.destinationState,
        equipmentType: prev.equipmentType,
        askingRateUsd: prev.askingRateUsd,
        notes: prev.notes,
        availableFrom,
        availableUntil,
        status: "OPEN",
      },
    });
  });

  return NextResponse.json({ data: { id: created.id } }, { status: 201 });
}
