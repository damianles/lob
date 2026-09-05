import { CapacityInterestStatus, LoadStatus, VerificationStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { serializeCapacityInterestError } from "@/lib/capacity-interest";
import { prisma } from "@/lib/prisma";
import { getActorContext } from "@/lib/request-context";
import { isSupplierActor } from "@/lib/simulated-actor-company";

const bodySchema = z.object({
  loadId: z.string().min(1),
  note: z.string().trim().max(500).optional(),
});

/**
 * Supplier requests anonymous capacity for one of their posted loads.
 * Carrier identity stays hidden until they Accept.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const actor = await getActorContext();
  if (!isSupplierActor(actor) || !actor.companyId || !actor.userId) {
    return NextResponse.json({ error: "Supplier accounts only." }, { status: 403 });
  }

  const { id: capacityOfferId } = await ctx.params;
  const raw = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const capacity = await prisma.capacityOffer.findUnique({
    where: { id: capacityOfferId },
    select: {
      id: true,
      status: true,
      carrierCompanyId: true,
      availableUntil: true,
      carrier: { select: { verificationStatus: true } },
    },
  });
  if (!capacity || capacity.status !== "OPEN") {
    return NextResponse.json({ error: "Capacity not found or no longer open." }, { status: 404 });
  }
  if (capacity.carrier.verificationStatus !== VerificationStatus.APPROVED) {
    return NextResponse.json({ error: "That capacity is not available." }, { status: 404 });
  }

  const today = new Date();
  const startToday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  if (capacity.availableUntil < startToday) {
    return NextResponse.json({ error: "That capacity window has ended." }, { status: 410 });
  }

  const excluded = await prisma.shipperCarrierExclusion.findUnique({
    where: {
      shipperCompanyId_carrierCompanyId: {
        shipperCompanyId: actor.companyId,
        carrierCompanyId: capacity.carrierCompanyId,
      },
    },
  });
  if (excluded) {
    return NextResponse.json({ error: "That capacity is not available." }, { status: 404 });
  }

  const load = await prisma.load.findFirst({
    where: {
      id: parsed.data.loadId,
      shipperCompanyId: actor.companyId,
      status: LoadStatus.POSTED,
      booking: { is: null },
    },
    select: { id: true },
  });
  if (!load) {
    return NextResponse.json(
      { error: "Pick one of your posted loads that is still open (not booked)." },
      { status: 400 },
    );
  }

  try {
    const row = await prisma.capacityInterest.create({
      data: {
        capacityOfferId: capacity.id,
        loadId: load.id,
        shipperCompanyId: actor.companyId,
        carrierCompanyId: capacity.carrierCompanyId,
        status: CapacityInterestStatus.PENDING,
        note: parsed.data.note?.trim() || null,
        createdByUserId: actor.userId,
      },
    });
    return NextResponse.json({ data: { id: row.id, status: row.status } }, { status: 201 });
  } catch (e) {
    const mapped = serializeCapacityInterestError(e);
    if (mapped) return NextResponse.json({ error: mapped.error }, { status: mapped.status });
    throw e;
  }
}
