import { type NextRequest, NextResponse } from "next/server";

import { parseAddressComponents, type ParsedPlace } from "@/lib/google-place";
import {
  nominatimLookup,
  nominatimReverse,
  nominatimToParsedPlace,
  parseNominatimPlaceId,
  placesProvider,
} from "@/lib/nominatim-place";
import { getActorContext } from "@/lib/request-context";

async function googleDetails(placeId: string, key: string) {
  const u = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  u.searchParams.set("place_id", placeId);
  u.searchParams.set("fields", "address_component,formatted_address,geometry,place_id,name");
  u.searchParams.set("key", key);
  u.searchParams.set("language", "en");

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
    return {
      ...parsed,
      lat: r.geometry?.location?.lat ?? null,
      lng: r.geometry?.location?.lng ?? null,
      name: r.name ?? null,
    };
  }
  return null;
}

/**
 * Place details for a selected autocomplete row.
 * Default: OpenStreetMap Nominatim (osm:node|way|relation:id).
 * Optional: Google when PLACES_PROVIDER=google.
 */
export async function GET(req: NextRequest) {
  const actor = await getActorContext();
  if (!actor.userId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const placeId = (req.nextUrl.searchParams.get("placeId") ?? "").trim();
  if (placeId.length < 3) {
    return NextResponse.json({ error: "placeId required." }, { status: 400 });
  }

  const provider = placesProvider();

  try {
    if (provider === "google" || !placeId.startsWith("osm:")) {
      const key = process.env.GOOGLE_MAPS_API_KEY?.trim();
      if (!key) {
        return NextResponse.json(
          { error: "not_configured", message: "No place provider configured for this place id." },
          { status: 503 },
        );
      }
      const data = await googleDetails(placeId, key);
      if (!data) return NextResponse.json({ error: "place_details" }, { status: 404 });
      return NextResponse.json({ data, provider: "google" });
    }

    const parsedId = parseNominatimPlaceId(placeId);
    if (!parsedId) {
      return NextResponse.json({ error: "invalid_osm_place_id" }, { status: 400 });
    }
    const row = await nominatimLookup(parsedId.osmType, parsedId.osmId);
    if (!row) return NextResponse.json({ error: "place_details" }, { status: 404 });
    let data = nominatimToParsedPlace(row);
    // OSM often omits postcode on the selected feature; reverse geocode fills it when possible.
    if (!data.zip && data.lat != null && data.lng != null) {
      try {
        const rev = await nominatimReverse(data.lat, data.lng);
        if (rev) {
          const fromRev = nominatimToParsedPlace(rev);
          data = {
            ...data,
            zip: fromRev.zip || data.zip,
            city: data.city || fromRev.city,
            state: data.state || fromRev.state,
            countryCode: data.countryCode || fromRev.countryCode,
            country: data.country || fromRev.country,
            line1: data.line1 || fromRev.line1,
          };
        }
      } catch {
        // keep lookup result
      }
    }
    return NextResponse.json({ data, provider: "nominatim" });
  } catch {
    return NextResponse.json({ error: "fetch_failed" }, { status: 502 });
  }
}
