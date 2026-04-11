import { randomUUID } from "node:crypto";
import { LoadStatus, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { findLaneBenchmark, validateOfferedRateAgainstBenchmark } from "@/lib/market-rate-lane";
import { parseRequestedPickupAt } from "@/lib/parse-pickup-date";
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

  const boardCutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);

  const clauses: Prisma.LoadWhereInput[] = [
    {
      OR: [
        { status: { not: LoadStatus.POSTED } },
        { AND: [{ status: LoadStatus.POSTED }, { requestedPickupAt: { gte: boardCutoff } }] },
      ],
    },
  ];
  if (hideRush) {
    clauses.push({ isRush: false });
  }

  const loads = await prisma.load.findMany({
    where: { AND: clauses },
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

  if (actor.role !== "SHIPPER") {
    return NextResponse.json({ error: "Only supplier accounts can post loads." }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createLoadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const payload = parsed.data;
  const pickupAt = parseRequestedPickupAt(payload.requestedPickupAt);
  if (!pickupAt) {
    return NextResponse.json({ error: "Invalid requestedPickupAt (use YYYY-MM-DD or ISO datetime)." }, { status: 400 });
  }

  const rateCheck = validateOfferedRateAgainstBenchmark({
    originState: payload.originState,
    destinationState: payload.destinationState,
    originZip: payload.originZip,
    destinationZip: payload.destinationZip,
    equipmentType: payload.equipmentType,
    offeredRateUsd: payload.offeredRateUsd,
  });

  if (!rateCheck.ok) {
    return NextResponse.json({ error: rateCheck.message }, { status: 400 });
  }

  const hit = findLaneBenchmark(
    payload.originState,
    payload.destinationState,
    payload.originZip,
    payload.destinationZip,
    payload.equipmentType,
  );

  const marketRateUsd =
    hit?.row.benchmarkAvgUsd != null ? new Prisma.Decimal(hit.row.benchmarkAvgUsd) : undefined;

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
      marketRateUsd,
      shipperCompanyId: actor.companyId,
      createdByUserId: actor.userId,
      uniquePickupCode: randomUUID().slice(0, 6).toUpperCase(),
      requestedPickupAt: pickupAt,
      extendedPosting: payload.extendedPosting
        ? (payload.extendedPosting as Prisma.InputJsonValue)
        : undefined,
    },
  });

  return NextResponse.json({ data: load }, { status: 201 });
}
