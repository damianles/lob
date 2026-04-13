import { NextResponse } from "next/server";

import { fetchUsNationalWeeklyDieselRetail } from "@/lib/insights/eia-weekly-diesel-us";
import { LEGAL_DIESEL_DATA_SOURCES, LEGAL_ROUTE_ALERT_SOURCES } from "@/lib/insights/legal-fuel-sources";
import { milesToKm } from "@/lib/units";
import { prisma } from "@/lib/prisma";
import { getActorContext } from "@/lib/request-context";

type Body = {
  origin?: string;
  destination?: string;
};

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

/**
 * Route distance (optional Google Directions) plus placeholders for fuel-stop ranking and weather/traffic.
 * Does not scrape GasBuddy or other retail sites — integrate licensed data when you are ready.
 */
export async function POST(req: Request) {
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
    return NextResponse.json({ error: "Route insights is a subscriber feature." }, { status: 403 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const origin = body.origin?.trim() ?? "";
  const destination = body.destination?.trim() ?? "";
  if (origin.length < 3 || destination.length < 3) {
    return NextResponse.json(
      { error: "Origin and destination must each be at least 3 characters (city, ZIP, or postal)." },
      { status: 400 },
    );
  }

  const key = process.env.GOOGLE_MAPS_API_KEY?.trim();
  let directions:
    | {
        ok: true;
        distanceMiles: number;
        distanceKm: number;
        durationText: string;
        stepSummaries: string[];
      }
    | { ok: false; reason: string } = { ok: false, reason: "not_configured" };

  if (key) {
    try {
      const u = new URL("https://maps.googleapis.com/maps/api/directions/json");
      u.searchParams.set("origin", origin);
      u.searchParams.set("destination", destination);
      u.searchParams.set("key", key);
      const res = await fetch(u.toString(), { next: { revalidate: 0 } });
      const j = (await res.json()) as {
        status: string;
        routes?: { legs: { distance: { value: number }; duration: { text: string }; steps: { html_instructions: string }[] }[] }[];
      };
      if (j.status === "OK" && j.routes?.[0]?.legs?.[0]) {
        const leg = j.routes[0].legs[0];
        const meters = leg.distance.value;
        const distanceMiles = meters * 0.000621371;
        directions = {
          ok: true,
          distanceMiles: Math.round(distanceMiles),
          distanceKm: Math.round(milesToKm(distanceMiles)),
          durationText: leg.duration.text,
          stepSummaries: leg.steps.slice(0, 12).map((s) => stripHtml(s.html_instructions)),
        };
      } else {
        directions = { ok: false, reason: j.status || "no_route" };
      }
    } catch {
      directions = { ok: false, reason: "fetch_error" };
    }
  }

  const hasWeather = Boolean(process.env.OPENWEATHER_API_KEY?.trim());
  const eiaWeekly = await fetchUsNationalWeeklyDieselRetail();

  const routeFuelBenchmarks = eiaWeekly.ok
    ? [
        {
          id: "eia-us-nus-weekly",
          label: "U.S. weekly national average — No. 2 diesel (retail)",
          usdPerGallon: eiaWeekly.usdPerGallon,
          period: eiaWeekly.period,
          provider: "EIA (U.S. federal)",
          href: eiaWeekly.documentationUrl,
        },
      ]
    : [];

  return NextResponse.json({
    data: {
      directions,
      legalDieselDataSources: LEGAL_DIESEL_DATA_SOURCES,
      legalRouteAlertSources: LEGAL_ROUTE_ALERT_SOURCES,
      routeFuel: {
        status: eiaWeekly.ok ? "benchmark_us_weekly_plus_tables" : "tables_and_licensed_vendor",
        title: "Diesel pricing along this route",
        summary:
          "Government datasets give **official averages** (weekly). They do not list every truck stop. LOB blends your lane tables at the endpoints and, when configured, layers the EIA U.S. national weekly retail benchmark. Cheapest-stop ranking requires a **licensed** feed (fleet card, rack index, or chain API) and geospatial matching to the route polyline.",
        benchmarks: routeFuelBenchmarks,
        perStopRanking: {
          status: "requires_licensed_feed",
          detail:
            "Implement: decode Directions polyline → sample corridor points → query your fuel vendor by radius, or use transaction-level card data. OPIS / WEX / Comdata-style agreements are the usual compliant path.",
        },
      },
      routeAlerts: {
        status: hasWeather ? "weather_provider_configured" : "foundation_only",
        title: "Weather, construction, traffic, and closures",
        summary:
          "Use **official or contracted** APIs only. Practical stack: Google Routes (traffic-aware) or HERE for flow/incidents; state **511** or **Open511** JSON for construction and closures; **NWS** (U.S.) and **MSC GeoMet** (Canada) for alerts along sampled points on the polyline. OpenWeather is optional for generic forecasts if you already use it.",
        checklist: [
          hasWeather
            ? "OPENWEATHER_API_KEY is set — add polyline sampling + alert thresholds."
            : "Add OPENWEATHER_API_KEY only if you want that provider’s forecasts (not required for NWS/MSC).",
          directions.ok
            ? "Directions polyline available — next: decode and sample lat/lon for NWS points + provincial 511 APIs."
            : "Enable GOOGLE_MAPS_API_KEY to obtain a polyline for corridor weather and incident sampling.",
          "Enable Google Routes API (or HERE) for live traffic and incident layers under your Maps contract.",
          "Map each state/province crossed to its 511 or Open511 endpoint for construction and hard closures.",
        ],
      },
      ethicsNote:
        "LOB does not scrape GasBuddy or other retail listing sites. Use EIA, Statistics Canada / NRCan publications, and commercial data agreements for prices; use DOT / weather authority APIs for road and alert data.",
    },
  });
}
