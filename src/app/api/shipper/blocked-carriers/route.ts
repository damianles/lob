import { VerificationStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { getActorContext } from "@/lib/request-context";

const putSchema = z.object({
  blockedCarrierCompanyIds: z.array(z.string().min(1)).max(200),
});

export async function GET() {
  const actor = await getActorContext();
  if (!actor.userId || actor.role !== "SHIPPER" || !actor.companyId) {
    return NextResponse.json({ error: "Supplier accounts only." }, { status: 403 });
  }

  const rows = await prisma.shipperCarrierExclusion.findMany({
    where: { shipperCompanyId: actor.companyId },
    include: {
      carrierCompany: {
        select: { id: true, legalName: true, dotNumber: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    data: {
      blocked: rows.map((r) => r.carrierCompany),
    },
  });
}

export async function PUT(req: Request) {
  const actor = await getActorContext();
  if (!actor.userId || actor.role !== "SHIPPER" || !actor.companyId) {
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

  const ids = [...new Set(parsed.data.blockedCarrierCompanyIds)];
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
  }

  await prisma.$transaction([
    prisma.shipperCarrierExclusion.deleteMany({ where: { shipperCompanyId: actor.companyId } }),
    ...(ids.length
      ? [
          prisma.shipperCarrierExclusion.createMany({
            data: ids.map((carrierCompanyId) => ({
              shipperCompanyId: actor.companyId!,
              carrierCompanyId,
            })),
          }),
        ]
      : []),
  ]);

  return NextResponse.json({ ok: true });
}
