/**
 * Normalize US ZIP or Canadian postal (FSA) for the `zipcodes` package distance lookup.
 * US: 5 digits. CA: first 3 chars of ANA NAN (e.g. V6B 2Y9 → V6B).
 */
export function normalizeForDistanceLookup(raw: string): string | null {
  const t = raw.trim().toUpperCase().replace(/\s+/g, "");
  if (!t) return null;
  if (/^\d/.test(t)) {
    const d = t.replace(/\D/g, "");
    return d.length >= 5 ? d.slice(0, 5) : null;
  }
  if (/^[A-Z]\d[A-Z]/.test(t) && t.length >= 3) {
    return t.slice(0, 3);
  }
  return null;
}

/** True if input looks like a Canadian postal (starts with letter). */
export function looksLikeCanadianPostal(raw: string): boolean {
  const t = raw.trim().toUpperCase();
  return /^[A-Z]/.test(t) && /[A-Z]\d[A-Z]/.test(t.replace(/\s/g, ""));
}

/** True if input looks like a US ZIP (5 digits). */
export function looksLikeUsZip(raw: string): boolean {
  const d = raw.replace(/\D/g, "");
  return d.length >= 5;
}
