import type { ParsedPlace } from "@/lib/google-place";

/** Comma, space, and dash variants for U.S. state and Canadian province 2-letter codes. */
const REGION_2: Record<string, true> = {
  AL: true, AK: true, AZ: true, AR: true, CA: true, CO: true, CT: true, DE: true, FL: true, GA: true, HI: true, ID: true, IL: true, IN: true, IA: true, KS: true, KY: true, LA: true, ME: true, MD: true, MA: true, MI: true, MN: true, MS: true, MO: true, MT: true, NE: true, NV: true, NH: true, NJ: true, NM: true, NY: true, NC: true, ND: true, OH: true, OK: true, OR: true, PA: true, RI: true, SC: true, SD: true, TN: true, TX: true, UT: true, VT: true, VA: true, WA: true, WV: true, WI: true, WY: true, DC: true,
  AB: true, BC: true, MB: true, NB: true, NL: true, NS: true, NT: true, NU: true, ON: true, PE: true, QC: true, SK: true, YT: true,
};

const REGION_NAME_TO_CODE: Record<string, string> = {
  alberta: "AB",
  "british columbia": "BC",
  manitoba: "MB",
  "new brunswick": "NB",
  newfoundland: "NL",
  "newfoundland and labrador": "NL",
  "northwest territories": "NT",
  "nova scotia": "NS",
  nunavut: "NU",
  ontario: "ON",
  "prince edward island": "PE",
  quebec: "QC",
  québec: "QC",
  saskatchewan: "SK",
  yukon: "YT",
  "yukon territory": "YT",
};

/**
 * 2-letter region for forms that expect `maxLength={2}` (U.S. state or CA province).
 * Maps full names (e.g. Alberta → AB) so we never store "AL" from a bad slice.
 */
export function regionCodeForLob(p: Pick<ParsedPlace, "state" | "countryCode">): string {
  const raw = (p.state || "").trim();
  if (!raw) return "";
  const compact = raw.replace(/[^A-Za-z]/g, "");
  if (compact.length === 2 && REGION_2[compact.toUpperCase()]) return compact.toUpperCase();
  const byName = REGION_NAME_TO_CODE[raw.toLowerCase()] ?? REGION_NAME_TO_CODE[compact.toLowerCase()];
  if (byName) return byName;
  if (compact.length > 2) {
    const two = compact.slice(0, 2).toUpperCase();
    if (REGION_2[two]) return two;
  }
  return compact.slice(0, 2).toUpperCase();
}

/** Space-separated string for load-board `includes` matching against city/state/zip. */
export function laneQueryTokenString(p: Pick<ParsedPlace, "city" | "state" | "zip">): string {
  return [p.city, p.state, p.zip].filter((s) => s && s.trim()).join(" ");
}

export type PlaceLaneFields = {
  city: string;
  state: string;
  zip: string;
};

/**
 * Fields to apply when Places resolves a location.
 * Display lanes use city/state; zip/postal is always captured when the API returns it.
 */
export function placeLaneFields(p: Pick<ParsedPlace, "city" | "state" | "zip" | "countryCode">): PlaceLaneFields {
  return {
    city: (p.city || "").trim(),
    state: regionCodeForLob(p),
    zip: (p.zip || "").trim().toUpperCase(),
  };
}
