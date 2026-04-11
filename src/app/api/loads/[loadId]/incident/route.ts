import { NextResponse } from "next/server";
import { IncidentType } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { reliabilityDeductions, reliabilityPolicy } from "@/lib/policies";

const reportIncidentSchema = z.object({
  reportedByCompanyId: z.string().min(1),
  type: z.nativeEnum(IncidentType),
  note: z.string().max(500).optional(),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ loadId: string }> },
) {
  const { loadId } = await ctx.params;
  const body = await req.json();
  const parsed = reportIncidentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const load = await prisma.load.findUnique({
    where: { id: loadId },
    include: { booking: true },
  });
  if (!load || !load.booking) {
    return NextResponse.json({ error: "Booked load not found." }, { status: 404 });
  }

  const scoreDelta = -reliabilityDeductions[parsed.data.type];
  const incident = await prisma.$transaction(async (tx) => {
    const created = await tx.incident.create({
      data: {
        loadId,
        reportedByCompanyId: parsed.data.reportedByCompanyId,
        targetCompanyId: load.booking!.carrierCompanyId,
        type: parsed.data.type,
        note: parsed.data.note,
        scoreDelta,
      },
    });

    const currentCompany = await tx.company.findUniqueOrThrow({
      where: { id: load.booking!.carrierCompanyId },
      select: { reliabilityScore: true },
    });

    await tx.company.update({
      where: { id: load.booking!.carrierCompanyId },
      data: {
        reliabilityScore: Math.max(
          reliabilityPolicy.floor,
          currentCompany.reliabilityScore + scoreDelta,
        ),
      },
    });

    return created;
  });

  return NextResponse.json({ data: incident }, { status: 201 });
}

