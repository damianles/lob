import { randomUUID } from "node:crypto";
import { LoadCarrierVisibilityMode, LoadStatus, Prisma, RateObservationSource, VerificationStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { canonicalCityKey } from "@/lib/city-canonical";
import {
  findLaneBenchmark,
  offeredAmountUsdEquivalent,
  validateOfferedRateAgainstBenchmark,
  zip5ForBenchmark,
  normalizeEquipmentForBenchmark,
} from "@/lib/market-rate-lane";
import { parseRequestedPickupAt } from "@/lib/parse-pickup-date";
import { prisma } from "@/lib/prisma";
import { getActorContext } from "@/lib/request-context";
import { carrierCompanyNameForViewer } from "@/lib/carrier-visibility";
import { shipperCompanyNameForViewer } from "@/lib/shipper-visibility";
import { reliabilityPolicy } from "@/lib/policies";
import { fetchPostedLoadVisibilityContext, postedLoadVisibleToCarrier } from "@/lib/carrier-load-access";
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

  let filtered = loads;
  if ((actor.role === "DISPATCHER" || actor.role === "DRIVER") && actor.companyId) {
    const posted = loads.filter((l) => l.status === LoadStatus.POSTED);
    if (posted.length) {
      const ctx = await fetchPostedLoadVisibilityContext(prisma, actor.companyId, posted);
      filtered = loads.filter((row) => {
        if (row.status !== LoadStatus.POSTED) return true;
        return postedLoadVisibleToCarrier(
          {
            id: row.id,
            shipperCompanyId: row.shipperCompanyId,
            carrierVisibilityMode: row.carrierVisibilityMode,
          },
          ctx,
        );
      });
    }
  }

  const visibilityActor = { companyId: actor.companyId, role: actor.role };
  const data = filtered.map((row) => {
    const visibleShipper = shipperCompanyNameForViewer(row.shipperCompany.legalName, row, visibilityActor);
    const bookingMasked = row.booking
      ? {
          ...row.booking,
          carrierCompany: {
            ...row.booking.carrierCompany,
            legalName:
              carrierCompanyNameForViewer(row.booking.carrierCompany.legalName, row, visibilityActor) ?? "",
          },
        }
      : null;
    return {
      ...row,
      shipperCompany: {
        ...row.shipperCompany,
        legalName: visibleShipper ?? "",
      },
      booking: bookingMasked,
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

  const rateCheck = await validateOfferedRateAgainstBenchmark({
    originState: payload.originState,
    destinationState: payload.destinationState,
    originZip: payload.originZip,
    destinationZip: payload.destinationZip,
    originCity: payload.originCity,
    destinationCity: payload.destinationCity,
    equipmentType: payload.equipmentType,
    offeredRateUsd: payload.offeredRateUsd,
    offerCurrency: payload.offerCurrency,
  });

  if (!rateCheck.ok) {
    return NextResponse.json({ error: rateCheck.message }, { status: 400 });
  }

  const hit = await findLaneBenchmark(
    payload.originState,
    payload.destinationState,
    payload.originZip,
    payload.destinationZip,
    payload.equipmentType,
    payload.originCity,
    payload.destinationCity,
  );

  const marketRateUsd =
    hit?.row.benchmarkAvgUsd != null ? new Prisma.Decimal(hit.row.benchmarkAvgUsd) : undefined;

  const rateUsdEq = offeredAmountUsdEquivalent(payload.offeredRateUsd, payload.offerCurrency);

  const visibilityMode =
    payload.carrierVisibilityMode === "TIER_ASSIGNED"
      ? LoadCarrierVisibilityMode.TIER_ASSIGNED
      : LoadCarrierVisibilityMode.OPEN;

  const tierCarrierIds = [...new Set(payload.tierAssignments.map((t) => t.carrierCompanyId))];
  const excludeIds = [...new Set(payload.perLoadExcludedCarrierIds)];

  const referencedIds = [...new Set([...tierCarrierIds, ...excludeIds])];
  if (referencedIds.length) {
    const okCompanies = await prisma.company.findMany({
      where: {
        id: { in: referencedIds },
        verificationStatus: VerificationStatus.APPROVED,
        carrierType: { not: null },
      },
      select: { id: true },
    });
    const ok = new Set(okCompanies.map((c) => c.id));
    const bad = referencedIds.filter((id) => !ok.has(id));
    if (bad.length) {
      return NextResponse.json(
        { error: `Invalid carrier id(s) for visibility rules: ${bad.slice(0, 5).join(", ")}` },
        { status: 400 },
      );
    }
  }

  if (tierCarrierIds.length) {
    const blockedOverlap = await prisma.shipperCarrierExclusion.findMany({
      where: {
        shipperCompanyId: actor.companyId!,
        carrierCompanyId: { in: tierCarrierIds },
      },
      select: { carrierCompanyId: true },
    });
    if (blockedOverlap.length) {
      return NextResponse.json(
        {
          error:
            "Cannot assign carriers you have blocked globally (Carrier preferences). Remove them from tiers or unblock first.",
        },
        { status: 400 },
      );
    }
  }

  const shipperCompanyId = actor.companyId;
  const createdByUserId = actor.userId;

  const load = await prisma.$transaction(async (tx) => {
    const row = await tx.load.create({
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
        offerCurrency: payload.offerCurrency,
        offeredRateUsd: payload.offeredRateUsd,
        marketRateUsd,
        shipperCompanyId,
        createdByUserId,
        uniquePickupCode: randomUUID().slice(0, 6).toUpperCase(),
        requestedPickupAt: pickupAt,
        carrierVisibilityMode: visibilityMode,
        extendedPosting: payload.extendedPosting
          ? (payload.extendedPosting as Prisma.InputJsonValue)
          : undefined,
        laneRateObservation: {
          create: {
            observedAt: new Date(),
            originState: payload.originState.toUpperCase().slice(0, 2),
            destState: payload.destinationState.toUpperCase().slice(0, 2),
            originCityCanon: canonicalCityKey(payload.originCity),
            destCityCanon: canonicalCityKey(payload.destinationCity),
            originZip5: zip5ForBenchmark(payload.originZip),
            destZip5: zip5ForBenchmark(payload.destinationZip),
            equipmentNorm: normalizeEquipmentForBenchmark(payload.equipmentType),
            rateUsd: new Prisma.Decimal(rateUsdEq.toFixed(2)),
            offerCurrency: payload.offerCurrency,
            source: RateObservationSource.APP,
          },
        },
      },
    });

    if (visibilityMode === LoadCarrierVisibilityMode.TIER_ASSIGNED && payload.tierAssignments.length) {
      await tx.loadCarrierTier.createMany({
        data: payload.tierAssignments.map((t) => ({
          loadId: row.id,
          carrierCompanyId: t.carrierCompanyId,
          tier: t.tier,
        })),
      });
    }

    if (excludeIds.length) {
      await tx.loadCarrierExclusion.createMany({
        data: excludeIds.map((carrierCompanyId) => ({
          loadId: row.id,
          carrierCompanyId,
        })),
      });
    }

    return row;
  });

  return NextResponse.json({ data: load }, { status: 201 });
}
