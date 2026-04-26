import { NextResponse } from "next/server";

import { extractLumberSpec } from "@/lib/lumber-spec";
import { prisma } from "@/lib/prisma";
import { getActorContext } from "@/lib/request-context";

/**
 * "Recent posts" picker — returns the last N loads this shipper has posted,
 * shaped exactly like a load template payload so the supplier post form can
 * one-click repost without saving a template first.
 *
 * Mills who post frequently but irregularly want this more than templates.
 */
export async function GET(req: Request) {
  const actor = await getActorContext();
  if (!actor.companyId || !actor.userId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  if (actor.role !== "SHIPPER") {
    return NextResponse.json({ error: "Only supplier accounts can repost loads." }, { status: 403 });
  }

  const url = new URL(req.url);
  const limit = Math.min(20, Math.max(1, Number(url.searchParams.get("limit") ?? 5) || 5));

  const rows = await prisma.load.findMany({
    where: { shipperCompanyId: actor.companyId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      referenceNumber: true,
      externalRef: true,
      originCity: true,
      originState: true,
      originZip: true,
      destinationCity: true,
      destinationState: true,
      destinationZip: true,
      equipmentType: true,
      weightLbs: true,
      isRush: true,
      isPrivate: true,
      offerCurrency: true,
      offeredRateUsd: true,
      extendedPosting: true,
      createdAt: true,
    },
  });

  const data = rows.map((r) => {
    const lumberSpec = extractLumberSpec(r.extendedPosting);
    const notes =
      r.extendedPosting && typeof r.extendedPosting === "object" && r.extendedPosting !== null
        ? (r.extendedPosting as Record<string, unknown>).notes
        : null;
    return {
      id: r.id,
      referenceNumber: r.referenceNumber,
      externalRef: r.externalRef,
      originCity: r.originCity,
      originState: r.originState,
      originZip: r.originZip,
      destinationCity: r.destinationCity,
      destinationState: r.destinationState,
      destinationZip: r.destinationZip,
      equipmentType: r.equipmentType,
      weightLbs: r.weightLbs,
      isRush: r.isRush,
      isPrivate: r.isPrivate,
      defaultRateUsd: r.offeredRateUsd ? Number(r.offeredRateUsd.toString()) : null,
      defaultCurrency: r.offerCurrency as "USD" | "CAD",
      notes: typeof notes === "string" ? notes : null,
      lumberSpec: lumberSpec ?? null,
      createdAt: r.createdAt.toISOString(),
    };
  });

  return NextResponse.json({ data });
}
