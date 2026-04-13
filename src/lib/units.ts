export type DistanceUnit = "mi" | "km";

export const DISTANCE_UNIT_STORAGE_KEY = "lob-distance-unit";

export function milesToKm(miles: number): number {
  return miles * 1.609344;
}

export function kmToMiles(km: number): number {
  return km / 1.609344;
}

export function formatDistanceFromMiles(miles: number | null, unit: DistanceUnit): string {
  if (miles == null || !Number.isFinite(miles)) return "—";
  if (unit === "mi") return `${Math.round(miles)}\u00a0mi`;
  return `${Math.round(milesToKm(miles))}\u00a0km`;
}

export function parseRadiusToMiles(raw: string, unit: DistanceUnit): number | null {
  const n = Number(raw.trim());
  if (!Number.isFinite(n) || n < 0) return null;
  return unit === "mi" ? n : kmToMiles(n);
}
