import * as zipcodes from "zipcodes";

import { canonicalCityKey } from "@/lib/city-canonical";
import { looksLikeCanadianPostal, looksLikeUsZip, normalizeForDistanceLookup } from "@/lib/postal";

type LatLng = { lat: number; lng: number };

type ZipRow = {
  zip?: string;
  latitude?: number;
  longitude?: number;
  city?: string;
  state?: string;
  country?: string;
};

const EARTH_MILES = 3958.7613;

const CA_PROVINCE_TO_CODE: Record<string, string> = {
  alberta: "AB",
  "british columbia": "BC",
  saskatchewan: "SK",
  manitoba: "MB",
  ontario: "ON",
  quebec: "QC",
  "québec": "QC",
  "new brunswick": "NB",
  "nova scotia": "NS",
  "prince edward island": "PE",
  "newfoundland and labrador": "NL",
  "newfoundland": "NL",
  "northwest territories": "NT",
  nunavut: "NU",
  yukon: "YT",
};

/** Hard fallbacks for common lumber cities if zipcodes city parse misses. */
const CITY_FALLBACK: Record<string, LatLng> = {
  "calgary|AB": { lat: 51.0447, lng: -114.0719 },
  "edmonton|AB": { lat: 53.5461, lng: -113.4938 },
  "red deer|AB": { lat: 52.2681, lng: -113.8112 },
  "grande prairie|AB": { lat: 55.1707, lng: -118.7947 },
  "lethbridge|AB": { lat: 49.6935, lng: -112.8418 },
  "vancouver|BC": { lat: 49.2827, lng: -123.1207 },
  "prince george|BC": { lat: 53.9171, lng: -122.7497 },
  "kelowna|BC": { lat: 49.888, lng: -119.496 },
  "kamloops|BC": { lat: 50.6745, lng: -120.3273 },
  "fort saint john|BC": { lat: 56.2524, lng: -120.8464 },
  "saskatoon|SK": { lat: 52.1579, lng: -106.6702 },
  "regina|SK": { lat: 50.4452, lng: -104.6189 },
  "winnipeg|MB": { lat: 49.8954, lng: -97.1385 },
  "toronto|ON": { lat: 43.6532, lng: -79.3832 },
  "thunder bay|ON": { lat: 48.3809, lng: -89.2477 },
  "montreal|QC": { lat: 45.5019, lng: -73.5674 },
  "portland|OR": { lat: 45.5152, lng: -122.6784 },
  "seattle|WA": { lat: 47.6062, lng: -122.3321 },
  "spokane|WA": { lat: 47.6588, lng: -117.426 },
  "boise|ID": { lat: 43.615, lng: -116.2023 },
  "missoula|MT": { lat: 46.8721, lng: -113.994 },
};

function regionCode(state: string): string {
  const t = state.trim();
  if (!t) return "";
  if (/^[A-Za-z]{2}$/.test(t)) return t.toUpperCase();
  return CA_PROVINCE_TO_CODE[t.toLowerCase()] ?? t.slice(0, 2).toUpperCase();
}

function cityIndexKey(city: string, state: string): string | null {
  const c = canonicalCityKey(city);
  const r = regionCode(state);
  if (!c || !r) return null;
  return `${c}|${r}`;
}

let cityIndex: Map<string, LatLng> | null = null;

function getCityIndex(): Map<string, LatLng> {
  if (cityIndex) return cityIndex;
  const map = new Map<string, LatLng>();
  const codes = (zipcodes as unknown as { codes?: Record<string, ZipRow> }).codes ?? {};
  for (const row of Object.values(codes)) {
    if (!row?.city || typeof row.latitude !== "number" || typeof row.longitude !== "number") continue;
    const baseCity = row.city.split(" (")[0]?.trim() ?? "";
    const key = cityIndexKey(baseCity, row.state ?? "");
    if (!key || map.has(key)) continue;
    map.set(key, { lat: row.latitude, lng: row.longitude });
  }
  cityIndex = map;
  return map;
}

function toRad(d: number): number {
  return (d * Math.PI) / 180;
}

function haversineMiles(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_MILES * Math.asin(Math.min(1, Math.sqrt(s)));
}

function pointFromZip(zip: string): LatLng | null {
  const n = normalizeForDistanceLookup(zip);
  if (!n) return null;
  const info = zipcodes.lookup(n) as ZipRow | undefined;
  if (!info || typeof info.latitude !== "number" || typeof info.longitude !== "number") return null;
  return { lat: info.latitude, lng: info.longitude };
}

function pointFromCity(city: string, state: string): LatLng | null {
  const key = cityIndexKey(city, state);
  if (!key) return null;
  return CITY_FALLBACK[key] ?? getCityIndex().get(key) ?? null;
}

export type PlaceForDistance = {
  city?: string;
  state?: string;
  zip?: string;
};

/**
 * Great-circle miles between two places.
 *
 * `zipcodes` is fine for US ZIPs and some Canadian FSAs, but it will happily
 * return 2 mi when both postals are in the same city even if the posted cities
 * are Calgary → Edmonton. When city names disagree and zip distance is tiny,
 * trust the cities.
 */
export function milesBetweenPlaces(origin: PlaceForDistance, destination: PlaceForDistance): number | null {
  const zipMiles = milesBetweenZips(origin.zip ?? "", destination.zip ?? "");
  const originCityPt = pointFromCity(origin.city ?? "", origin.state ?? "");
  const destCityPt = pointFromCity(destination.city ?? "", destination.state ?? "");
  const cityMiles =
    originCityPt && destCityPt ? haversineMiles(originCityPt, destCityPt) : null;

  const originKey = canonicalCityKey(origin.city ?? "");
  const destKey = canonicalCityKey(destination.city ?? "");
  const citiesDiffer = Boolean(originKey && destKey && originKey !== destKey);

  if (citiesDiffer && cityMiles != null && cityMiles > 40 && (zipMiles == null || zipMiles < 25)) {
    return cityMiles;
  }
  if (zipMiles != null && cityMiles != null && citiesDiffer && zipMiles < cityMiles * 0.35) {
    return cityMiles;
  }
  return zipMiles ?? cityMiles;
}

/** Great-circle miles between US ZIP or Canadian FSA / full postal; null if unknown. */
export function milesBetweenZips(zipA: string, zipB: string): number | null {
  const a = normalizeForDistanceLookup(zipA);
  const b = normalizeForDistanceLookup(zipB);
  if (!a || !b) return null;

  // Never feed a Canadian FSA that zipcodes cannot resolve into a US collision.
  if ((looksLikeCanadianPostal(zipA) || looksLikeCanadianPostal(zipB)) && (!pointFromZip(zipA) || !pointFromZip(zipB))) {
    return null;
  }

  const miles = zipcodes.distance(a, b);
  if (typeof miles === "number" && Number.isFinite(miles)) return miles;

  const pa = pointFromZip(zipA);
  const pb = pointFromZip(zipB);
  if (pa && pb) return haversineMiles(pa, pb);
  return null;
}

export function looksLikePostalForDistance(raw: string): boolean {
  return looksLikeUsZip(raw) || looksLikeCanadianPostal(raw);
}
