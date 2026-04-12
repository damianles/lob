import { NextResponse } from "next/server";

import { blendedDieselForLane } from "@/lib/fuel-prices";
import { prisma } from "@/lib/prisma";
import { getActorContext } from "@/lib/request-context";

/**
 * Lane diesel snapshot: origin vs destination state averages (table-backed; swap for EIA/live later).
 * Same access rules as lane analytics: subscriber companies or admin.
 */
export async function GET(req: Request) {
  const actor = await getActorContext();
  if (!actor.userId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  let isSubscriber = actor.role === "ADMIN";
  if (!isSubscriber && actor.companyId) {
    const company = await prisma.company.findUnique({
      where: { id: actor.companyId },
      select: { analyticsSubscriber: true },
    });
    isSubscriber = Boolean(company?.analyticsSubscriber);
  }

  if (!isSubscriber) {
    return NextResponse.json({ error: "Insights (fuel) is a subscriber feature." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const originZip = searchParams.get("originZip")?.replace(/\D/g, "").slice(0, 5) ?? "";
  const destZip = searchParams.get("destinationZip")?.replace(/\D/g, "").slice(0, 5) ?? "";
  if (originZip.length < 5 || destZip.length < 5) {
    return NextResponse.json(
      { error: "Provide originZip and destinationZip (5 digits)." },
      { status: 400 },
    );
  }

  const blend = blendedDieselForLane(originZip, destZip);
  return NextResponse.json({
    data: {
      ...blend,
      note:
        "Prices are approximate state-level retail diesel averages for planning (demo data file). Wire EIA or a carrier data feed for live racks.",
    },
  });
}
