import * as zipcodes from "zipcodes";

function normalizeUsZip(raw: string): string | null {
  const d = raw.replace(/\D/g, "");
  if (d.length >= 5) return d.slice(0, 5);
  return null;
}

/** Great-circle miles between two US/CA postal codes; null if either is unknown. */
export function milesBetweenZips(zipA: string, zipB: string): number | null {
  const a = normalizeUsZip(zipA);
  const b = normalizeUsZip(zipB);
  if (!a || !b) return null;
  const miles = zipcodes.distance(a, b);
  return typeof miles === "number" && Number.isFinite(miles) ? miles : null;
}
