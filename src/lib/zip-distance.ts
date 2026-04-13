import * as zipcodes from "zipcodes";

import { normalizeForDistanceLookup } from "@/lib/postal";

/** Great-circle miles between US ZIP or Canadian FSA / full postal; null if unknown. */
export function milesBetweenZips(zipA: string, zipB: string): number | null {
  const a = normalizeForDistanceLookup(zipA);
  const b = normalizeForDistanceLookup(zipB);
  if (!a || !b) return null;
  const miles = zipcodes.distance(a, b);
  return typeof miles === "number" && Number.isFinite(miles) ? miles : null;
}
