import { VerificationStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { getActorContext } from "@/lib/request-context";
import { isSupplierActor } from "@/lib/simulated-actor-company";

const putSchema = z.object({
  assignments: z
    .array(
      z.object({
        carrierCompanyId: z.string().min(1),
        tier: z.number().int().min(1).max(3),
      }),
    )
    .max(500),
});

export async function GET() {
  const actor = await getActorContext();
  if (!isSupplierActor(actor)) {
    return NextResponse.json({ error: "Supplier accounts only." }, { status: 403 });
  }

  const rows = await prisma.shipperCarrierTier.findMany({
    where: { shipperCompanyId: actor.companyId },
    include: {
      carrierCompany: {
        select: { id: true, legalName: true, dotNumber: true },
      },
    },
    orderBy: [{ tier: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({
    data: {
      assignments: rows.map((r) => ({
        carrierCompanyId: r.carrierCompanyId,
        tier: r.tier,
        carrier: r.carrierCompany,
      })),
      counts: {
        1: rows.filter((r) => r.tier === 1).length,
        2: rows.filter((r) => r.tier === 2).length,
        3: rows.filter((r) => r.tier === 3).length,
      },
    },
  });
}

export async function PUT(req: Request) {
  const actor = await getActorContext();
  if (!isSupplierActor(actor)) {
    return NextResponse.json({ error: "Supplier accounts only." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = putSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const byCarrier = new Map<string, number>();
  for (const a of parsed.data.assignments) {
    byCarrier.set(a.carrierCompanyId, a.tier);
  }
  const ids = [...byCarrier.keys()];

  if (ids.length) {
    const valid = await prisma.company.findMany({
      where: {
        id: { in: ids },
        verificationStatus: VerificationStatus.APPROVED,
        carrierType: { not: null },
      },
      select: { id: true },
    });
    const validSet = new Set(valid.map((v) => v.id));
    const invalid = ids.filter((id) => !validSet.has(id));
    if (invalid.length) {
      return NextResponse.json(
        { error: `Unknown or unapproved carrier id(s): ${invalid.slice(0, 5).join(", ")}` },
        { status: 400 },
      );
    }

    const blocked = await prisma.shipperCarrierExclusion.findMany({
      where: { shipperCompanyId: actor.companyId, carrierCompanyId: { in: ids } },
      select: { carrierCompanyId: true },
    });
    if (blocked.length) {
      return NextResponse.json(
        {
          error:
            "Cannot place excluded carriers in a tier. Clear the exclusion first, or leave them out of tiers.",
        },
        { status: 400 },
      );
    }
  }

  const data = [...byCarrier.entries()].map(([carrierCompanyId, tier]) => ({
    shipperCompanyId: actor.companyId,
    carrierCompanyId,
    tier,
  }));

  await prisma.$transaction([
    prisma.shipperCarrierTier.deleteMany({ where: { shipperCompanyId: actor.companyId } }),
    ...(data.length
      ? [
          prisma.shipperCarrierTier.createMany({
            data,
          }),
        ]
      : []),
  ]);

  return NextResponse.json({ ok: true });
}
