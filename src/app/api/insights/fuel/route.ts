import { NextResponse } from "next/server";

import { blendedDieselForPostalEndpoints } from "@/lib/fuel-prices";
import { fetchUsNationalWeeklyDieselRetail } from "@/lib/insights/eia-weekly-diesel-us";
import { LEGAL_DIESEL_DATA_SOURCES } from "@/lib/insights/legal-fuel-sources";
import { prisma } from "@/lib/prisma";
import { getActorContext } from "@/lib/request-context";

/**
 * Lane diesel snapshot: US state or Canadian province averages (table-backed).
 * Query: `origin` & `destination` (US ZIP or CA postal / FSA), or legacy `originZip` & `destinationZip`.
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
  const origin = (searchParams.get("origin") ?? searchParams.get("originZip") ?? "").trim();
  const destination = (searchParams.get("destination") ?? searchParams.get("destinationZip") ?? "").trim();

  const blend = blendedDieselForPostalEndpoints(origin, destination);
  if (!blend) {
    return NextResponse.json(
      {
        error:
          "Enter a valid US ZIP (5 digits) or Canadian postal / FSA for both origin and destination (e.g. 97201 & T2P 1J4).",
      },
      { status: 400 },
    );
  }

  const eiaWeekly = await fetchUsNationalWeeklyDieselRetail();

  return NextResponse.json({
    data: {
      ...blend,
      note:
        "Endpoints use LOB reference tables (province/state). Optional EIA_API_KEY adds the official U.S. weekly national retail average for context. Station-level “cheapest on route” needs a licensed feed (fleet card, OPIS, etc.) — never scrape consumer price apps.",
      liveUsWeeklyRetail: eiaWeekly.ok
        ? {
            usdPerGallon: eiaWeekly.usdPerGallon,
            period: eiaWeekly.period,
            provider: eiaWeekly.provider,
            href: eiaWeekly.documentationUrl,
          }
        : null,
      legalDieselDataSources: LEGAL_DIESEL_DATA_SOURCES,
    },
  });
}
