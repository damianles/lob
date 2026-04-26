/**
 * Lumber unit conversions sales/dispatch teams actually need.
 *
 * Sales quotes in **board feet** (BF) or **MBF** (= 1000 BF). Dispatch
 * needs **lbs** to choose the right truck. The conversion depends on
 * species density at the shipped moisture content.
 *
 * Densities below are mid-range values for North American framing &
 * panel stock. They're rounded to 1 lb / BF — accurate enough to pick
 * the right trailer; final scale tickets are still authoritative.
 *
 * 1 BF = 144 cubic inches = ~1/12 cubic foot.
 *   So lbs = BF * (lbs/cuft) / 12.
 */

export type SpeciesDensityRow = {
  species: string;
  /** Lumber-spec.ts code — same set we already use on the form. */
  code: string;
  /** Approximate green density (lbs/cuft). */
  greenLbsPerCuft: number;
  /** Approximate KD-19% density (lbs/cuft). */
  kdLbsPerCuft: number;
};

/**
 * Source: USDA Wood Handbook, Forest Products Lab specific-gravity tables,
 * cross-checked with WCLB and SFPA shipping-weight charts. Numbers are
 * pragmatic rounded values for trucking, not engineering design loads.
 */
export const SPECIES_DENSITY: SpeciesDensityRow[] = [
  { species: "SPF (Spruce-Pine-Fir)", code: "SPF", greenLbsPerCuft: 35, kdLbsPerCuft: 28 },
  { species: "Douglas Fir", code: "DF", greenLbsPerCuft: 38, kdLbsPerCuft: 32 },
  { species: "Douglas Fir-Larch", code: "DF_LARCH", greenLbsPerCuft: 39, kdLbsPerCuft: 33 },
  { species: "Southern Yellow Pine", code: "SYP", greenLbsPerCuft: 41, kdLbsPerCuft: 35 },
  { species: "Hem-Fir", code: "HEM_FIR", greenLbsPerCuft: 36, kdLbsPerCuft: 28 },
  { species: "Western Red Cedar", code: "WRC", greenLbsPerCuft: 27, kdLbsPerCuft: 23 },
  { species: "Yellow Cedar", code: "YELLOW_CEDAR", greenLbsPerCuft: 31, kdLbsPerCuft: 27 },
  { species: "White Pine", code: "WHITE_PINE", greenLbsPerCuft: 29, kdLbsPerCuft: 25 },
  { species: "Ponderosa Pine", code: "PONDEROSA", greenLbsPerCuft: 31, kdLbsPerCuft: 28 },
  { species: "Oak", code: "OAK", greenLbsPerCuft: 60, kdLbsPerCuft: 48 },
  { species: "Maple", code: "MAPLE", greenLbsPerCuft: 56, kdLbsPerCuft: 44 },
  { species: "Birch", code: "BIRCH", greenLbsPerCuft: 54, kdLbsPerCuft: 44 },
  { species: "Ash", code: "ASH", greenLbsPerCuft: 48, kdLbsPerCuft: 42 },
  { species: "Poplar", code: "POPLAR", greenLbsPerCuft: 38, kdLbsPerCuft: 30 },
  /** Mixed = average of common softwood lanes; useful for swag estimates. */
  { species: "Mixed species", code: "MIXED", greenLbsPerCuft: 36, kdLbsPerCuft: 30 },
  { species: "Other / unspecified", code: "OTHER", greenLbsPerCuft: 36, kdLbsPerCuft: 30 },
];

/** Drying state used by the converter. Maps to LumberDryness. */
export type DrynessKey = "GREEN" | "KD";

export function densityFor(speciesCode: string | undefined, dryness: DrynessKey): number | null {
  if (!speciesCode) return null;
  const row = SPECIES_DENSITY.find((r) => r.code === speciesCode);
  if (!row) return null;
  return dryness === "GREEN" ? row.greenLbsPerCuft : row.kdLbsPerCuft;
}

/**
 * Map a Load lumberDryness code (one of GREEN/AD/KD/MC19/MC15/MC12) to one
 * of the two density columns we actually carry. Air-dried + KD all use the
 * dry column; everything else falls back to green.
 */
export function drynessKeyFromCode(code: string | undefined | null): DrynessKey {
  if (!code) return "KD";
  return code === "GREEN" ? "GREEN" : "KD";
}

export function bfToLbs(boardFeet: number, lbsPerCuft: number): number {
  if (!Number.isFinite(boardFeet) || !Number.isFinite(lbsPerCuft)) return 0;
  return (boardFeet * lbsPerCuft) / 12;
}

export function mbfToLbs(mbf: number, lbsPerCuft: number): number {
  return bfToLbs(mbf * 1000, lbsPerCuft);
}

export function lbsToBf(lbs: number, lbsPerCuft: number): number {
  if (!Number.isFinite(lbs) || !Number.isFinite(lbsPerCuft) || lbsPerCuft <= 0) return 0;
  return (lbs * 12) / lbsPerCuft;
}

export function lbsToMbf(lbs: number, lbsPerCuft: number): number {
  return lbsToBf(lbs, lbsPerCuft) / 1000;
}

/** Quick utility for "this truck holds N MBF of {species}" sizing. */
export function maxMbfForLbsCap(maxLbs: number, lbsPerCuft: number): number {
  return lbsToMbf(maxLbs, lbsPerCuft);
}

export function formatBf(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "—";
  return Math.round(n).toLocaleString();
}

export function formatMbf(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "—";
  return n.toFixed(2);
}

export function formatLbs(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "—";
  return Math.round(n).toLocaleString();
}
