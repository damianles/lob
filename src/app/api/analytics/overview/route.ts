import { NextResponse } from "next/server";

import { getAnalyticsOverview, type AnalyticsPeriod } from "@/lib/analytics";
import { prisma } from "@/lib/prisma";
import { getActorContext } from "@/lib/request-context";

const allowedPeriods = new Set<AnalyticsPeriod>(["week", "30d", "60d", "90d", "yoy"]);

export async function GET(req: Request) {
  const actor = await getActorContext();
  if (!actor.userId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  if (!actor.companyId && actor.role !== "ADMIN") {
    return NextResponse.json({ error: "User is not linked to a company yet." }, { status: 400 });
  }

  if (actor.role !== "ADMIN" && actor.companyId) {
    const company = await prisma.company.findUnique({
      where: { id: actor.companyId },
      select: { analyticsSubscriber: true },
    });
    if (!company?.analyticsSubscriber) {
      return NextResponse.json(
        { error: "Analytics is available for paid subscribers only." },
        { status: 402 },
      );
    }
  }

  const { searchParams } = new URL(req.url);
  const period = (searchParams.get("period") ?? "30d") as AnalyticsPeriod;
  if (!allowedPeriods.has(period)) {
    return NextResponse.json({ error: "Invalid period." }, { status: 400 });
  }

  const result = await getAnalyticsOverview(
    {
      role: actor.role,
      companyId: actor.companyId,
    },
    {
      period,
      originCity: searchParams.get("originCity") ?? undefined,
      originState: searchParams.get("originState") ?? undefined,
      destinationCity: searchParams.get("destinationCity") ?? undefined,
      destinationState: searchParams.get("destinationState") ?? undefined,
      quickLane: searchParams.get("quickLane") ?? undefined,
    },
  );

  return NextResponse.json({ data: result });
}

