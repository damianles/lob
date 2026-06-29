import { NextResponse } from "next/server";
import { IncidentType } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { reliabilityDeductions, reliabilityPolicy } from "@/lib/policies";
import { getActorContext } from "@/lib/request-context";

const reportIncidentSchema = z.object({
  type: z.nativeEnum(IncidentType),
  note: z.string().max(500).optional(),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ loadId: string }> },
) {
  const actor = await getActorContext();
  if (!actor.userId || !actor.companyId) {
    return NextResponse.json({ error: "Sign in and complete onboarding." }, { status: 401 });
  }
  if (actor.role !== "SHIPPER" && actor.realRole !== "ADMIN") {
    return NextResponse.json({ error: "Only suppliers can report incidents." }, { status: 403 });
  }

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
  if (actor.realRole !== "ADMIN" && load.shipperCompanyId !== actor.companyId) {
    return NextResponse.json({ error: "You can only report incidents on your own loads." }, { status: 403 });
  }

  const scoreDelta = -reliabilityDeductions[parsed.data.type];
  const incident = await prisma.$transaction(async (tx) => {
    const created = await tx.incident.create({
      data: {
        loadId,
        reportedByCompanyId: actor.companyId!,
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

