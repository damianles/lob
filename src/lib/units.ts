import type { ViewerKind } from "@/lib/viewer-role";

export type DistanceUnit = "mi" | "km";

/** Legacy / guests / admins — single browser preference. */
export const DISTANCE_UNIT_STORAGE_KEY_LEGACY = "lob-distance-unit";

/** Shippers (suppliers) — load board EMR etc. */
export const DISTANCE_UNIT_STORAGE_KEY_SUPPLIER = "lob-distance-unit-supplier";

/** Carriers — load board EMR etc. */
export const DISTANCE_UNIT_STORAGE_KEY_CARRIER = "lob-distance-unit-carrier";

/** @deprecated alias — use DISTANCE_UNIT_STORAGE_KEY_LEGACY */
export const DISTANCE_UNIT_STORAGE_KEY = DISTANCE_UNIT_STORAGE_KEY_LEGACY;

export function distanceUnitStorageKeyForViewerKind(kind: ViewerKind): string {
  if (kind === "SHIPPER") return DISTANCE_UNIT_STORAGE_KEY_SUPPLIER;
  if (kind === "CARRIER") return DISTANCE_UNIT_STORAGE_KEY_CARRIER;
  return DISTANCE_UNIT_STORAGE_KEY_LEGACY;
}

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
