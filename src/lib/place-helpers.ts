import type { ParsedPlace } from "@/lib/google-place";

/** Comma, space, and dash variants for U.S. state and Canadian province 2-letter codes. */
const REGION_2: Record<string, true> = {
  AL: true, AK: true, AZ: true, AR: true, CA: true, CO: true, CT: true, DE: true, FL: true, GA: true, HI: true, ID: true, IL: true, IN: true, IA: true, KS: true, KY: true, LA: true, ME: true, MD: true, MA: true, MI: true, MN: true, MS: true, MO: true, MT: true, NE: true, NV: true, NH: true, NJ: true, NM: true, NY: true, NC: true, ND: true, OH: true, OK: true, OR: true, PA: true, RI: true, SC: true, SD: true, TN: true, TX: true, UT: true, VT: true, VA: true, WA: true, WV: true, WI: true, WY: true, DC: true,
  AB: true, BC: true, MB: true, NB: true, NL: true, NS: true, NT: true, NU: true, ON: true, PE: true, QC: true, SK: true, YT: true,
};

/**
 * 2-letter region for forms that expect `maxLength={2}` (U.S. state or CA province).
 */
export function regionCodeForLob(p: Pick<ParsedPlace, "state" | "countryCode">): string {
  const raw = (p.state || "").replace(/[^A-Za-z]/g, "");
  if (raw.length === 2 && REGION_2[raw.toUpperCase()]) return raw.toUpperCase();
  if (raw.length > 2) {
    const two = raw.slice(0, 2).toUpperCase();
    if (REGION_2[two]) return two;
  }
  return raw.slice(0, 2).toUpperCase();
}

/** Space-separated string for load-board `includes` matching against city/state/zip. */
export function laneQueryTokenString(p: Pick<ParsedPlace, "city" | "state" | "zip">): string {
  return [p.city, p.state, p.zip].filter((s) => s && s.trim()).join(" ");
}
