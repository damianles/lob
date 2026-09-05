/**
 * OpenStreetMap Nominatim — same map data Organic Maps / OsmAnd use.
 * Nominatim is the public geocoding API; the apps themselves are offline clients.
 * @see https://operations.osmfoundation.org/policies/nominatim/
 */

import type { ParsedPlace } from "@/lib/google-place";
import { regionCodeForLob } from "@/lib/place-helpers";

export type NominatimResult = {
  place_id: number;
  osm_type?: string;
  osm_id?: number;
  display_name: string;
  lat?: string;
  lon?: string;
  name?: string;
  address?: {
    house_number?: string;
    road?: string;
    pedestrian?: string;
    city?: string;
    town?: string;
    village?: string;
    hamlet?: string;
    municipality?: string;
    county?: string;
    state?: string;
    "ISO3166-2-lvl4"?: string;
    postcode?: string;
    country?: string;
    country_code?: string;
  };
};

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";

/** Stable id we round-trip through autocomplete → details. */
export function nominatimPlaceId(r: NominatimResult): string {
  if (r.osm_type && r.osm_id != null) return `osm:${r.osm_type}:${r.osm_id}`;
  return `osm:place:${r.place_id}`;
}

export function parseNominatimPlaceId(placeId: string): { osmType: string; osmId: string } | null {
  const m = /^osm:(node|way|relation):(\d+)$/i.exec(placeId.trim());
  if (!m) return null;
  return { osmType: m[1].toLowerCase(), osmId: m[2] };
}

function stateCode(addr: NominatimResult["address"]): string {
  if (!addr) return "";
  const iso = addr["ISO3166-2-lvl4"];
  if (iso && iso.includes("-")) return iso.split("-")[1]!.toUpperCase();
  const s = (addr.state ?? "").trim();
  if (/^[A-Za-z]{2}$/.test(s)) return s.toUpperCase();
  // Full names (e.g. Alberta) — never naive slice (would become AL).
  return regionCodeForLob({ state: s, countryCode: (addr.country_code ?? "").toUpperCase() });
}

function cityFrom(addr: NominatimResult["address"]): string {
  if (!addr) return "";
  return (
    addr.city ||
    addr.town ||
    addr.village ||
    addr.hamlet ||
    addr.municipality ||
    addr.county ||
    ""
  );
}

export function nominatimToParsedPlace(r: NominatimResult): ParsedPlace & {
  lat: number | null;
  lng: number | null;
  name: string | null;
} {
  const addr = r.address ?? {};
  const line1 = [addr.house_number, addr.road || addr.pedestrian].filter(Boolean).join(" ").trim();
  const countryCode = (addr.country_code ?? "").toUpperCase();
  return {
    line1,
    city: cityFrom(addr),
    state: stateCode(addr),
    zip: addr.postcode ?? "",
    country: addr.country ?? "",
    countryCode,
    formattedAddress: r.display_name,
    placeId: nominatimPlaceId(r),
    lat: r.lat != null ? Number(r.lat) : null,
    lng: r.lon != null ? Number(r.lon) : null,
    name: r.name || null,
  };
}

function nominatimHeaders(): HeadersInit {
  const contact = process.env.NOMINATIM_CONTACT_EMAIL?.trim() || "lob@lumberoneboard.com";
  return {
    Accept: "application/json",
    "User-Agent": `LumberOneBoard/1.0 (${contact})`,
  };
}

export async function nominatimSearch(q: string, mode: "city" | "address" | "geocode"): Promise<NominatimResult[]> {
  const u = new URL(`${NOMINATIM_BASE}/search`);
  u.searchParams.set("q", q);
  u.searchParams.set("format", "jsonv2");
  u.searchParams.set("addressdetails", "1");
  u.searchParams.set("limit", "8");
  u.searchParams.set("countrycodes", "us,ca");
  if (mode === "city") {
    u.searchParams.set("featuretype", "city");
  }
  const res = await fetch(u.toString(), {
    headers: nominatimHeaders(),
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`nominatim_search_${res.status}`);
  const j = (await res.json()) as NominatimResult[];
  return Array.isArray(j) ? j : [];
}

export async function nominatimLookup(osmType: string, osmId: string): Promise<NominatimResult | null> {
  const u = new URL(`${NOMINATIM_BASE}/lookup`);
  u.searchParams.set("osm_ids", `${osmType[0]!.toUpperCase()}${osmId}`);
  u.searchParams.set("format", "jsonv2");
  u.searchParams.set("addressdetails", "1");
  const res = await fetch(u.toString(), {
    headers: nominatimHeaders(),
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`nominatim_lookup_${res.status}`);
  const j = (await res.json()) as NominatimResult[];
  return Array.isArray(j) && j[0] ? j[0] : null;
}

/** Fill missing postcode when lookup returned coords but no postcode (common on OSM). */
export async function nominatimReverse(lat: number, lon: number): Promise<NominatimResult | null> {
  const u = new URL(`${NOMINATIM_BASE}/reverse`);
  u.searchParams.set("lat", String(lat));
  u.searchParams.set("lon", String(lon));
  u.searchParams.set("format", "jsonv2");
  u.searchParams.set("addressdetails", "1");
  u.searchParams.set("zoom", "18");
  const res = await fetch(u.toString(), {
    headers: nominatimHeaders(),
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`nominatim_reverse_${res.status}`);
  const j = (await res.json()) as NominatimResult & { error?: string };
  if (j.error) return null;
  return j;
}

/** Prefer OSM/Nominatim unless PLACES_PROVIDER=google and a Google key is set. */
export function placesProvider(): "nominatim" | "google" {
  const pref = (process.env.PLACES_PROVIDER ?? "nominatim").trim().toLowerCase();
  if (pref === "google" && process.env.GOOGLE_MAPS_API_KEY?.trim()) return "google";
  return "nominatim";
}
