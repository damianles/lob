import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { getActorContext } from "@/lib/request-context";

/**
 * Address-only saved lanes for shippers — lighter-weight than LoadTemplate.
 *
 * GET  /api/lanes  → list the company's lanes, sorted by recent use
 * POST /api/lanes  → create a new lane (or upsert by exact route match)
 */

const upsertSchema = z.object({
  label: z.string().trim().max(80).optional(),
  originCity: z.string().trim().min(1).max(80),
  originState: z.string().trim().min(2).max(2),
  originZip: z.string().trim().min(3).max(12),
  originAddress: z.string().trim().max(120).optional(),
  originPhone: z.string().trim().max(40).optional(),
  destinationCity: z.string().trim().min(1).max(80),
  destinationState: z.string().trim().min(2).max(2),
  destinationZip: z.string().trim().min(3).max(12),
  destinationAddress: z.string().trim().max(120).optional(),
  destinationPhone: z.string().trim().max(40).optional(),
});

export async function GET() {
  const actor = await getActorContext();
  if (!actor.companyId || !actor.userId || actor.role !== "SHIPPER") {
    return NextResponse.json({ error: "Sign in as a supplier to use saved lanes." }, { status: 401 });
  }

  const rows = await prisma.savedLane.findMany({
    where: { companyId: actor.companyId },
    // Frequently-used lanes float to the top; tie-broken by most recent activity
    // and finally creation order, so brand-new lanes don't get buried.
    orderBy: [{ lastUsedAt: { sort: "desc", nulls: "last" } }, { useCount: "desc" }, { createdAt: "desc" }],
    take: 200,
  });

  return NextResponse.json({ data: rows });
}

export async function POST(req: Request) {
  const actor = await getActorContext();
  if (!actor.companyId || !actor.userId || actor.role !== "SHIPPER") {
    return NextResponse.json({ error: "Sign in as a supplier to save lanes." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const t = parsed.data;

  // Soft-upsert: if an exact route match already exists for this shipper,
  // update its label / extra fields instead of creating a duplicate row.
  const originState = t.originState.toUpperCase();
  const destinationState = t.destinationState.toUpperCase();

  const existing = await prisma.savedLane.findFirst({
    where: {
      companyId: actor.companyId,
      originCity: t.originCity,
      originState,
      originZip: t.originZip,
      destinationCity: t.destinationCity,
      destinationState,
      destinationZip: t.destinationZip,
    },
    select: { id: true },
  });

  if (existing) {
    const updated = await prisma.savedLane.update({
      where: { id: existing.id },
      data: {
        label: t.label?.trim() || null,
        originAddress: t.originAddress?.trim() || null,
        originPhone: t.originPhone?.trim() || null,
        destinationAddress: t.destinationAddress?.trim() || null,
        destinationPhone: t.destinationPhone?.trim() || null,
      },
    });
    return NextResponse.json({ data: updated, deduped: true });
  }

  const row = await prisma.savedLane.create({
    data: {
      companyId: actor.companyId,
      createdByUserId: actor.userId,
      label: t.label?.trim() || null,
      originCity: t.originCity,
      originState,
      originZip: t.originZip,
      originAddress: t.originAddress?.trim() || null,
      originPhone: t.originPhone?.trim() || null,
      destinationCity: t.destinationCity,
      destinationState,
      destinationZip: t.destinationZip,
      destinationAddress: t.destinationAddress?.trim() || null,
      destinationPhone: t.destinationPhone?.trim() || null,
    },
  });

  return NextResponse.json({ data: row }, { status: 201 });
}
