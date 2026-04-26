import { NextResponse } from "next/server";
import { z } from "zod";

import { lumberSpecSchema } from "@/lib/lumber-spec";
import { prisma } from "@/lib/prisma";
import { getActorContext } from "@/lib/request-context";

/**
 * Reusable post-load templates owned by the authenticated shipper company.
 * Power-user mills stamp out the same lane × spec week after week — saving a
 * template lets them re-post in two clicks.
 *
 * GET  /api/templates  → list the company's templates
 * POST /api/templates  → create a new template snapshot
 */

const upsertSchema = z.object({
  name: z.string().min(1).max(80),
  shortLabel: z.string().max(80).optional(),
  originCity: z.string().max(80).optional(),
  originState: z.string().max(2).optional(),
  originZip: z.string().max(12).optional(),
  destinationCity: z.string().max(80).optional(),
  destinationState: z.string().max(2).optional(),
  destinationZip: z.string().max(12).optional(),
  equipmentType: z.string().max(40).optional(),
  weightLbs: z.number().int().positive().optional(),
  isRush: z.boolean().optional(),
  isPrivate: z.boolean().optional(),
  defaultRateUsd: z.number().positive().optional(),
  defaultCurrency: z.enum(["USD", "CAD"]).optional(),
  notes: z.string().max(800).optional(),
  lumberSpec: lumberSpecSchema.optional(),
});

export async function GET() {
  const actor = await getActorContext();
  if (!actor.companyId || !actor.userId || actor.role !== "SHIPPER") {
    return NextResponse.json({ error: "Sign in as a supplier to use templates." }, { status: 401 });
  }

  const rows = await prisma.loadTemplate.findMany({
    where: { companyId: actor.companyId },
    orderBy: [{ updatedAt: "desc" }],
    take: 100,
  });

  return NextResponse.json({ data: rows });
}

export async function POST(req: Request) {
  const actor = await getActorContext();
  if (!actor.companyId || !actor.userId || actor.role !== "SHIPPER") {
    return NextResponse.json({ error: "Sign in as a supplier to save templates." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const t = parsed.data;

  const row = await prisma.loadTemplate.create({
    data: {
      companyId: actor.companyId,
      createdByUserId: actor.userId,
      name: t.name.trim(),
      shortLabel: t.shortLabel?.trim() || null,
      originCity: t.originCity?.trim() || null,
      originState: t.originState?.toUpperCase() || null,
      originZip: t.originZip?.trim() || null,
      destinationCity: t.destinationCity?.trim() || null,
      destinationState: t.destinationState?.toUpperCase() || null,
      destinationZip: t.destinationZip?.trim() || null,
      equipmentType: t.equipmentType?.trim() || null,
      weightLbs: t.weightLbs ?? null,
      isRush: Boolean(t.isRush),
      isPrivate: Boolean(t.isPrivate),
      defaultRateUsd: t.defaultRateUsd ?? null,
      defaultCurrency: t.defaultCurrency ?? "USD",
      notes: t.notes?.trim() || null,
      lumberSpec: t.lumberSpec ? (t.lumberSpec as object) : undefined,
    },
  });

  return NextResponse.json({ data: row }, { status: 201 });
}
