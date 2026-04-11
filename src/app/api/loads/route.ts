import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getActorContext } from "@/lib/request-context";
import { shipperCompanyNameForViewer } from "@/lib/shipper-visibility";
import { reliabilityPolicy } from "@/lib/policies";
import { createLoadSchema } from "@/lib/validation";

export async function GET() {
  const actor = await getActorContext();
  let hideRush = false;

  if (actor.companyId && (actor.role === "DISPATCHER" || actor.role === "DRIVER")) {
    const company = await prisma.company.findUnique({
      where: { id: actor.companyId },
      select: { reliabilityScore: true },
    });
    if (company && company.reliabilityScore < reliabilityPolicy.rushEligibilityMinimum) {
      hideRush = true;
    }
  }

  const loads = await prisma.load.findMany({
    where: hideRush ? { isRush: false } : undefined,
    orderBy: [{ isRush: "desc" }, { createdAt: "desc" }],
    include: {
      shipperCompany: {
        select: {
          id: true,
          legalName: true,
        },
      },
      booking: {
        include: {
          carrierCompany: {
            select: {
              id: true,
              legalName: true,
              carrierType: true,
              reliabilityScore: true,
            },
          },
        },
      },
    },
    take: 100,
  });

  const visibilityActor = { companyId: actor.companyId, role: actor.role };
  const data = loads.map((row) => {
    const visible = shipperCompanyNameForViewer(row.shipperCompany.legalName, row, visibilityActor);
    return {
      ...row,
      shipperCompany: {
        ...row.shipperCompany,
        legalName: visible ?? "",
      },
    };
  });

  return NextResponse.json({ data });
}

export async function POST(req: Request) {
  const actor = await getActorContext();
  if (!actor.companyId || !actor.userId) {
    return NextResponse.json(
      { error: "Missing actor context. Provide x-company-id and x-user-id headers." },
      { status: 401 },
    );
  }

  const body = await req.json();
  const parsed = createLoadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const payload = parsed.data;
  const load = await prisma.load.create({
    data: {
      referenceNumber: `LOB-${randomUUID().slice(0, 8).toUpperCase()}`,
      originCity: payload.originCity,
      originState: payload.originState.toUpperCase(),
      originZip: payload.originZip,
      destinationCity: payload.destinationCity,
      destinationState: payload.destinationState.toUpperCase(),
      destinationZip: payload.destinationZip,
      weightLbs: payload.weightLbs,
      equipmentType: payload.equipmentType,
      isRush: payload.isRush,
      isPrivate: payload.isPrivate,
      offeredRateUsd: payload.offeredRateUsd,
      shipperCompanyId: actor.companyId,
      createdByUserId: actor.userId,
      uniquePickupCode: randomUUID().slice(0, 6).toUpperCase(),
    },
  });

  return NextResponse.json({ data: load }, { status: 201 });
}

