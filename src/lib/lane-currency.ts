/** US state / territory two-letter codes (incl. DC, PR) for offer-currency inference. */
export const US_JURISDICTION_CODES = new Set(
  "AL,AK,AZ,AR,CA,CO,CT,DE,FL,GA,HI,ID,IL,IN,IA,KS,KY,LA,ME,MD,MA,MI,MN,MS,MO,MT,NE,NV,NH,NJ,NM,NY,NC,ND,OH,OK,OR,PA,RI,SC,SD,TN,TX,UT,VT,VA,WA,WV,WI,WY,DC,PR,AS,VI,GU,MP"
    .split(",")
    .map((s) => s.trim()),
);

/** Canadian province / territory codes. */
export const CA_PROVINCES = new Set([
  "AB",
  "BC",
  "MB",
  "NB",
  "NL",
  "NS",
  "NT",
  "NU",
  "ON",
  "PE",
  "QC",
  "SK",
  "YT",
]);

/**
 * Infers posted rate currency for lane matching:
 * - Both ends in Canada → CAD (wholesale lumber moves, domestic Canada).
 * - All other cases → USD (US–US, US–Canada, Mexico, etc. — use USD unless both CA).
 */
export function inferOfferCurrency(originState: string, destinationState: string): "USD" | "CAD" {
  const o = normalize2(originState);
  const d = normalize2(destinationState);
  if (CA_PROVINCES.has(o) && CA_PROVINCES.has(d)) return "CAD";
  return "USD";
}

function normalize2(s: string): string {
  return s.trim().toUpperCase().slice(0, 2);
}

function isKnownRegionCode(st: string): boolean {
  return st.length === 2 && (US_JURISDICTION_CODES.has(st) || CA_PROVINCES.has(st));
}

/**
 * Parses cells from the wholesaler lane spreadsheets:
 * - `City_ST` (e.g. Prince George_BC, Ottawa_ON)
 * - `City ST` (e.g. Fort McMurray AB)
 * - Leading/trailing spaces / commas normalized.
 */
export function parsePostedLocationCell(raw: unknown): { city: string; state: string } | null {
  let t = String(raw ?? "")
    .trim()
    .replace(/^\s*,\s*|\s*,\s*$/g, "");
  t = t.replace(/\s+/g, " ");
  if (!t) return null;

  const usc = t.lastIndexOf("_");
  if (usc > 0) {
    const city = t.slice(0, usc).trim();
    let st = t.slice(usc + 1).trim().toUpperCase().slice(0, 2);
    if (city.length >= 2 && isKnownRegionCode(st)) {
      return { city, state: st };
    }
  }

  const m = t.match(/^(.+?)\s+([A-Za-z]{2})$/);
  if (m) {
    const city = m[1].trim();
    const st = m[2].toUpperCase();
    if (city.length >= 2 && isKnownRegionCode(st)) {
      return { city, state: st };
    }
  }
  return null;
}
