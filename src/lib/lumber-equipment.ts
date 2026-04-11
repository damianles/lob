/** Lumber equipment codes shown on the board; full names in UI. */

export const LUMBER_EQUIPMENT = [
  { code: "SB", label: "Super B" },
  { code: "Tri", label: "Tri Axle" },
  { code: "MX", label: "Maxi" },
  { code: "Tan", label: "Tandem" },
  { code: "CW", label: "Curtain Wall" },
] as const;

export type LumberEquipmentCode = (typeof LUMBER_EQUIPMENT)[number]["code"];

export const LUMBER_EQUIPMENT_CODES = new Set<string>(LUMBER_EQUIPMENT.map((e) => e.code));

export function equipmentLabel(code: string): string {
  const row = LUMBER_EQUIPMENT.find((e) => e.code === code);
  return row ? `${row.label} (${row.code})` : code;
}

/** Short tag for dense tables (matches primary codes + legacy seed values). */
export function equipmentShortTag(eq: string): string {
  if (LUMBER_EQUIPMENT_CODES.has(eq)) return eq;
  const lower = eq.toLowerCase();
  if (lower.includes("super")) return "SB";
  if (lower.includes("tri")) return "Tri";
  if (lower.includes("maxi")) return "MX";
  if (lower.includes("tandem")) return "Tan";
  if (lower.includes("curtain")) return "CW";
  if (lower.includes("flat")) return "FB";
  if (lower.includes("dry") || lower.includes("van")) return "V";
  if (lower.includes("reef")) return "R";
  return eq.slice(0, 3).toUpperCase();
}
