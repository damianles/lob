import { NextResponse } from "next/server";
import { z } from "zod";

import { parseDateInputToUtc, validateCapacityAvailabilityWindow } from "@/lib/capacity-window";
import { prisma } from "@/lib/prisma";
import { getActorContext } from "@/lib/request-context";

const createSchema = z.object({
  originZip: z.string().min(5).max(10),
  originCity: z.string().optional(),
  originState: z.string().max(2).optional(),
  destinationZip: z.string().min(5).max(10),
  destinationCity: z.string().optional(),
  destinationState: z.string().max(2).optional(),
  equipmentType: z.string().min(1),
  askingRateUsd: z.number().positive(),
  notes: z.string().max(500).optional(),
  /** YYYY-MM-DD (UTC calendar day). */
  availableFrom: z.string().min(10).max(10),
  availableUntil: z.string().min(10).max(10),
});

function startOfTodayUtc(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate(), 0, 0, 0, 0));
}

/**
 * Anonymous capacity board for suppliers. Carrier identity is never returned here.
 */
export async function GET(req: Request) {
  const actor = await getActorContext();
  if (!actor.userId || (actor.role !== "SHIPPER" && actor.role !== "ADMIN")) {
    return NextResponse.json({ error: "Suppliers and admins only." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const originZip = searchParams.get("originZip")?.trim();
  const destinationZip = searchParams.get("destinationZip")?.trim();

  const today = startOfTodayUtc();

  let blockedCarrierIds: string[] = [];
  if (actor.role === "SHIPPER" && actor.companyId) {
    const ex = await prisma.shipperCarrierExclusion.findMany({
      where: { shipperCompanyId: actor.companyId },
      select: { carrierCompanyId: true },
    });
    blockedCarrierIds = ex.map((e) => e.carrierCompanyId);
  }

  const rows = await prisma.capacityOffer.findMany({
    where: {
      status: "OPEN",
      availableUntil: { gte: today },
      ...(blockedCarrierIds.length ? { carrierCompanyId: { notIn: blockedCarrierIds } } : {}),
      ...(originZip ? { originZip: { startsWith: originZip.replace(/\D/g, "").slice(0, 5) } } : {}),
      ...(destinationZip
        ? { destinationZip: { startsWith: destinationZip.replace(/\D/g, "").slice(0, 5) } }
        : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 80,
    select: {
      id: true,
      originZip: true,
      originCity: true,
      originState: true,
      destinationZip: true,
      destinationCity: true,
      destinationState: true,
      equipmentType: true,
      askingRateUsd: true,
      notes: true,
      availableFrom: true,
      availableUntil: true,
      createdAt: true,
    },
  });

  const data = rows.map((r) => ({
    ...r,
    askingRateUsd: Number(r.askingRateUsd),
    availableFrom: r.availableFrom.toISOString(),
    availableUntil: r.availableUntil.toISOString(),
    createdAt: r.createdAt.toISOString(),
  }));

  return NextResponse.json({ data });
}

export async function POST(req: Request) {
  const actor = await getActorContext();
  if (!actor.companyId || !actor.userId) {
    return NextResponse.json({ error: "Sign in and link a carrier company." }, { status: 401 });
  }
  if (actor.role !== "DISPATCHER") {
    return NextResponse.json({ error: "Only carrier (transport) accounts can post capacity." }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
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

  const row = await prisma.capacityOffer.create({
    data: {
      carrierCompanyId: actor.companyId,
      originZip: parsed.data.originZip.replace(/\D/g, "").slice(0, 5),
      originCity: parsed.data.originCity,
      originState: parsed.data.originState?.toUpperCase(),
      destinationZip: parsed.data.destinationZip.replace(/\D/g, "").slice(0, 5),
      destinationCity: parsed.data.destinationCity,
      destinationState: parsed.data.destinationState?.toUpperCase(),
      equipmentType: parsed.data.equipmentType,
      askingRateUsd: parsed.data.askingRateUsd,
      notes: parsed.data.notes,
      availableFrom,
      availableUntil,
    },
  });

  return NextResponse.json({ data: { id: row.id } }, { status: 201 });
}
