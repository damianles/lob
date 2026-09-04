import { type NextRequest, NextResponse } from "next/server";

import {
  nominatimPlaceId,
  nominatimSearch,
  placesProvider,
} from "@/lib/nominatim-place";
import { getActorContext } from "@/lib/request-context";

const MAX_LEN = 120;

async function googleAutocomplete(q: string, mode: string, key: string) {
  const types = mode === "address" ? "address" : mode === "geocode" ? "geocode" : "(cities)";
  const u = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json");
  u.searchParams.set("input", q);
  u.searchParams.set("types", types);
  u.searchParams.set("key", key);
  u.searchParams.set("components", "country:ca|country:us");
  u.searchParams.set("region", "ca");
  u.searchParams.set("language", "en");

  const res = await fetch(u.toString());
  const j = (await res.json()) as {
    status: string;
    error_message?: string;
    predictions?: { place_id: string; description: string }[];
  };
  if (j.status === "OK" && j.predictions) {
    return {
      ok: true as const,
      predictions: j.predictions.map((p) => ({ placeId: p.place_id, label: p.description })),
    };
  }
  if (j.status === "ZERO_RESULTS") {
    return { ok: true as const, predictions: [] as { placeId: string; label: string }[] };
  }
  return { ok: false as const, message: j.error_message ?? j.status };
}

/**
 * Place typeahead for US/CA. Default: OpenStreetMap Nominatim
 * (same data as Organic Maps / OsmAnd). Set PLACES_PROVIDER=google + GOOGLE_MAPS_API_KEY for Google.
 */
export async function GET(req: NextRequest) {
  const actor = await getActorContext();
  if (!actor.userId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2) {
    return NextResponse.json({ predictions: [] });
  }
  if (q.length > MAX_LEN) {
    return NextResponse.json({ error: "Input too long." }, { status: 400 });
  }

  const modeParam = req.nextUrl.searchParams.get("mode") ?? "city";
  const mode: "city" | "address" | "geocode" =
    modeParam === "address" ? "address" : modeParam === "geocode" ? "geocode" : "city";

  const provider = placesProvider();

  try {
    if (provider === "google") {
      const key = process.env.GOOGLE_MAPS_API_KEY!.trim();
      const g = await googleAutocomplete(q, mode, key);
      if (!g.ok) {
        return NextResponse.json({ error: "places_error", message: g.message }, { status: 502 });
      }
      return NextResponse.json({ predictions: g.predictions, provider: "google" });
    }

    const rows = await nominatimSearch(q, mode);
    return NextResponse.json({
      predictions: rows.map((r) => ({ placeId: nominatimPlaceId(r), label: r.display_name })),
      provider: "nominatim",
    });
  } catch {
    return NextResponse.json({ error: "fetch_failed" }, { status: 502 });
  }
}
