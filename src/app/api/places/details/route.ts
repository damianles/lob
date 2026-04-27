import { type NextRequest, NextResponse } from "next/server";

import { parseAddressComponents, type ParsedPlace } from "@/lib/google-place";
import { getActorContext } from "@/lib/request-context";

/**
 * Google Place Details — returns structured address for a place_id.
 */
export async function GET(req: NextRequest) {
  const actor = await getActorContext();
  if (!actor.userId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const key = process.env.GOOGLE_MAPS_API_KEY?.trim();
  if (!key) {
    return NextResponse.json(
      { error: "not_configured", message: "Set GOOGLE_MAPS_API_KEY in Vercel and enable Place Details for the key." },
      { status: 503 },
    );
  }

  const placeId = (req.nextUrl.searchParams.get("placeId") ?? "").trim();
  if (placeId.length < 3) {
    return NextResponse.json({ error: "placeId required." }, { status: 400 });
  }

  const u = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  u.searchParams.set("place_id", placeId);
  u.searchParams.set(
    "fields",
    "address_component,formatted_address,geometry,place_id,name",
  );
  u.searchParams.set("key", key);
  u.searchParams.set("language", "en");

  try {
    const res = await fetch(u.toString());
    const j = (await res.json()) as {
      status: string;
      result?: {
        place_id: string;
        formatted_address: string;
        name?: string;
        address_components: { long_name: string; short_name: string; types: string[] }[];
        geometry?: { location?: { lat: number; lng: number } };
      };
    };
    if (j.status === "OK" && j.result?.address_components) {
      const r = j.result;
      const parsed: ParsedPlace = parseAddressComponents(
        r.address_components,
        r.formatted_address,
        r.place_id,
      );
      const out = {
        ...parsed,
        lat: r.geometry?.location?.lat ?? null,
        lng: r.geometry?.location?.lng ?? null,
        name: r.name ?? null,
      };
      return NextResponse.json({ data: out });
    }
    return NextResponse.json(
      { error: "place_details", status: j.status },
      { status: 404 },
    );
  } catch {
    return NextResponse.json({ error: "fetch_failed" }, { status: 502 });
  }
}
