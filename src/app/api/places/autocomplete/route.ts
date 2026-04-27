import { type NextRequest, NextResponse } from "next/server";

import { getActorContext } from "@/lib/request-context";

const MAX_LEN = 120;

/**
 * Proxy for Google Place Autocomplete (keeps key server-side).
 * Enable "Places API" + "Places API (New)" is different — legacy endpoint below uses
 * the same key as GOOGLE_MAPS_API_KEY (must have Places Autocomplete in Cloud Console).
 */
export async function GET(req: NextRequest) {
  const actor = await getActorContext();
  if (!actor.userId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const key = process.env.GOOGLE_MAPS_API_KEY?.trim();
  if (!key) {
    return NextResponse.json(
      { error: "not_configured", message: "Set GOOGLE_MAPS_API_KEY in Vercel and enable Places API (Autocomplete) for the key." },
      { status: 503 },
    );
  }

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2) {
    return NextResponse.json({ predictions: [] });
  }
  if (q.length > MAX_LEN) {
    return NextResponse.json({ error: "Input too long." }, { status: 400 });
  }

  const mode = req.nextUrl.searchParams.get("mode") ?? "city";
  // (cities) = towns/cities; address = street; geocode = broader (addresses + localities)
  const types =
    mode === "address" ? "address" : mode === "geocode" ? "geocode" : "(cities)";

  const u = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json");
  u.searchParams.set("input", q);
  u.searchParams.set("types", types);
  u.searchParams.set("key", key);
  u.searchParams.set("components", "country:us|country:ca");
  u.searchParams.set("language", "en");

  try {
    const res = await fetch(u.toString());
    const j = (await res.json()) as {
      status: string;
      error_message?: string;
      predictions?: { place_id: string; description: string }[];
    };
    if (j.status === "OK" && j.predictions) {
      return NextResponse.json({
        predictions: j.predictions.map((p) => ({ placeId: p.place_id, label: p.description })),
      });
    }
    if (j.status === "ZERO_RESULTS") {
      return NextResponse.json({ predictions: [] });
    }
    return NextResponse.json(
      { error: "places_error", message: j.error_message ?? j.status },
      { status: 502 },
    );
  } catch {
    return NextResponse.json({ error: "fetch_failed" }, { status: 502 });
  }
}
