import { z } from "zod";

/**
 * Structured spec for a posted lumber load.
 * Stored inside `Load.extendedPosting.lumber` (Json column) so we don't need
 * a Prisma migration to start collecting this. Once patterns stabilize we can
 * promote selected fields to first-class columns.
 */

export const LUMBER_PRODUCT_CATEGORY_OPTIONS = [
  { value: "DIMENSIONAL", label: "Dimensional lumber (2x4, 2x6, etc.)" },
  { value: "BOARDS", label: "Boards / 1x stock" },
  { value: "TIMBERS", label: "Timbers / heavy structural" },
  { value: "PANELS", label: "Panels (OSB / plywood / MDF)" },
  { value: "ENGINEERED", label: "Engineered wood (LVL / I-joist / glulam)" },
  { value: "BUNDLES", label: "Pre-cut bundles / studs" },
  { value: "POLES", label: "Poles / posts" },
  { value: "PELLETS", label: "Wood pellets / bagged" },
  { value: "CHIPS", label: "Chips / hog fuel / sawdust" },
  { value: "MILLWORK", label: "Millwork / mouldings / finished" },
  { value: "OTHER", label: "Other / mixed" },
] as const;

export const LUMBER_SPECIES_OPTIONS = [
  { value: "SPF", label: "SPF (Spruce-Pine-Fir)" },
  { value: "DF", label: "Douglas Fir" },
  { value: "DF_LARCH", label: "Douglas Fir-Larch" },
  { value: "SYP", label: "Southern Yellow Pine" },
  { value: "HEM_FIR", label: "Hem-Fir" },
  { value: "WRC", label: "Western Red Cedar" },
  { value: "YELLOW_CEDAR", label: "Yellow Cedar" },
  { value: "WHITE_PINE", label: "White Pine" },
  { value: "PONDEROSA", label: "Ponderosa Pine" },
  { value: "OAK", label: "Oak (Red / White)" },
  { value: "MAPLE", label: "Maple" },
  { value: "BIRCH", label: "Birch" },
  { value: "ASH", label: "Ash" },
  { value: "POPLAR", label: "Poplar" },
  { value: "MIXED", label: "Mixed species" },
  { value: "OTHER", label: "Other" },
] as const;

export const LUMBER_DRYNESS_OPTIONS = [
  { value: "GREEN", label: "Green (unseasoned)" },
  { value: "AD", label: "Air-dried" },
  { value: "KD", label: "Kiln-dried (KD)" },
  { value: "MC19", label: "KD ≤ 19% MC" },
  { value: "MC15", label: "KD ≤ 15% MC" },
  { value: "MC12", label: "KD ≤ 12% MC" },
] as const;

export const LUMBER_TREATMENT_OPTIONS = [
  { value: "NONE", label: "Untreated" },
  { value: "ACQ", label: "ACQ pressure-treated" },
  { value: "MCA", label: "MCA pressure-treated" },
  { value: "CCA", label: "CCA pressure-treated" },
  { value: "BORATE", label: "Borate (interior)" },
  { value: "FIRE_RETARDANT", label: "Fire-retardant treated (FRT)" },
  { value: "BROWN_STAIN", label: "Brown stain / weatherized" },
  { value: "ANTI_SAPSTAIN", label: "Anti-sapstain dipped" },
] as const;

export const LUMBER_CERTIFICATION_OPTIONS = [
  { value: "HT", label: "HT (heat-treated, ISPM-15)" },
  { value: "ISPM15", label: "ISPM-15 stamped" },
  { value: "FSC", label: "FSC certified" },
  { value: "PEFC", label: "PEFC certified" },
  { value: "SFI", label: "SFI certified" },
  { value: "CSA", label: "CSA O80 (preservatives)" },
  { value: "APA", label: "APA stamped (panels)" },
] as const;

export const LUMBER_PANEL_TYPE_OPTIONS = [
  { value: "OSB", label: "OSB" },
  { value: "PLY_SOFT", label: "Softwood plywood" },
  { value: "PLY_HARD", label: "Hardwood plywood" },
  { value: "MDF", label: "MDF" },
  { value: "MDO", label: "MDO" },
  { value: "HDF", label: "HDF" },
  { value: "PARTICLEBOARD", label: "Particleboard" },
  { value: "LVL", label: "LVL" },
  { value: "LSL", label: "LSL / PSL" },
  { value: "I_JOIST", label: "I-joist" },
  { value: "GLULAM", label: "Glulam beam" },
  { value: "CLT", label: "CLT (cross-laminated)" },
] as const;

export const LUMBER_EDGE_PROFILE_OPTIONS = [
  { value: "S4S", label: "S4S (surfaced 4 sides)" },
  { value: "S2S", label: "S2S" },
  { value: "ROUGH", label: "Rough sawn" },
  { value: "T_AND_G", label: "T&G (tongue & groove)" },
  { value: "SHIPLAP", label: "Shiplap" },
  { value: "PATTERN", label: "Pattern stock" },
  { value: "BEVEL", label: "Bevel siding" },
] as const;

export const LUMBER_PACKAGING_OPTIONS = [
  { value: "STANDARD", label: "Standard banded units" },
  { value: "PAPER_WRAP", label: "Paper-wrapped units" },
  { value: "PLASTIC_WRAP", label: "Plastic / poly-wrapped" },
  { value: "BANDED_ONLY", label: "Banded only (no wrap)" },
  { value: "PALLETIZED", label: "Palletized (LTL-friendly)" },
  { value: "BULK", label: "Bulk / loose" },
] as const;

export const LUMBER_LOADING_METHOD_OPTIONS = [
  { value: "SIDE_LOAD", label: "Side load (forklift)" },
  { value: "REAR_LOAD", label: "Rear load (dock)" },
  { value: "OVERHEAD", label: "Overhead crane" },
  { value: "LIVE_LOAD", label: "Live load (driver waits)" },
  { value: "DROP_TRAILER", label: "Drop trailer" },
] as const;

export type LumberProductCategory = (typeof LUMBER_PRODUCT_CATEGORY_OPTIONS)[number]["value"];
export type LumberSpecies = (typeof LUMBER_SPECIES_OPTIONS)[number]["value"];
export type LumberDryness = (typeof LUMBER_DRYNESS_OPTIONS)[number]["value"];
export type LumberTreatment = (typeof LUMBER_TREATMENT_OPTIONS)[number]["value"];
export type LumberCertification = (typeof LUMBER_CERTIFICATION_OPTIONS)[number]["value"];
export type LumberPanelType = (typeof LUMBER_PANEL_TYPE_OPTIONS)[number]["value"];
export type LumberEdgeProfile = (typeof LUMBER_EDGE_PROFILE_OPTIONS)[number]["value"];
export type LumberPackaging = (typeof LUMBER_PACKAGING_OPTIONS)[number]["value"];
export type LumberLoadingMethod = (typeof LUMBER_LOADING_METHOD_OPTIONS)[number]["value"];

export const lumberSpecSchema = z.object({
  productCategory: z.enum([
    "DIMENSIONAL",
    "BOARDS",
    "TIMBERS",
    "PANELS",
    "ENGINEERED",
    "BUNDLES",
    "POLES",
    "PELLETS",
    "CHIPS",
    "MILLWORK",
    "OTHER",
  ]).optional(),
  species: z.string().optional(),
  grade: z.string().max(80).optional(),
  dryness: z.string().optional(),
  moistureContentPct: z.number().min(0).max(80).optional(),
  treatment: z.string().optional(),
  certifications: z.array(z.string()).optional(),
  bundleCount: z.number().int().min(0).max(10000).optional(),
  pieceCount: z.number().int().min(0).max(1000000).optional(),
  nominalSize: z.string().max(40).optional(),
  lengthFt: z.number().min(0).max(100).optional(),
  /** When mixed lengths in one load — overrides single lengthFt. */
  lengthsFt: z.array(z.number().min(0).max(100)).max(20).optional(),
  thicknessIn: z.number().min(0).max(48).optional(),
  widthIn: z.number().min(0).max(120).optional(),
  panelType: z.string().optional(),
  panelGrade: z.string().max(60).optional(),
  panelSize: z.string().max(40).optional(),
  edgeProfile: z.string().optional(),
  packaging: z.string().optional(),
  loadingMethod: z.string().optional(),
  /** Total board feet for the load (BF). */
  boardFeet: z.number().min(0).max(1_000_000).optional(),
  /** Total MBF for the load (1000 board feet). */
  mbf: z.number().min(0).max(10_000).optional(),
  /** True if customer requires kiln tickets / mill tally on delivery. */
  millTallyRequired: z.boolean().optional(),
  fragile: z.boolean().optional(),
  weatherSensitive: z.boolean().optional(),
  exportShipment: z.boolean().optional(),
  notes: z.string().max(800).optional(),
});

export type LumberSpec = z.infer<typeof lumberSpecSchema>;

/**
 * Pull the lumber payload out of an `extendedPosting` JSON blob without
 * crashing if the shape is unexpected. Returns null when absent.
 */
export function extractLumberSpec(extended: unknown): LumberSpec | null {
  if (!extended || typeof extended !== "object") return null;
  const obj = extended as Record<string, unknown>;
  const candidate = obj.lumber ?? obj.lumberSpec;
  if (!candidate || typeof candidate !== "object") return null;
  const result = lumberSpecSchema.safeParse(candidate);
  return result.success ? result.data : null;
}

/**
 * Map a parsed LumberSpec to the first-class `lumber*` columns on Load.
 * Returns `{}` if `spec` is null/undefined so it can be spread into a Prisma
 * `data` payload safely.
 */
export function lumberSpecToLoadColumns(spec: LumberSpec | null | undefined): {
  lumberCategory?: string | null;
  lumberSpecies?: string | null;
  lumberGrade?: string | null;
  lumberDryness?: string | null;
  lumberTreatment?: string | null;
  lumberPanelType?: string | null;
  lumberNominalSize?: string | null;
  lumberLengthFt?: number | null;
  lumberPieceCount?: number | null;
  lumberBundleCount?: number | null;
  lumberMbf?: number | null;
  lumberPackaging?: string | null;
  lumberLoadingMethod?: string | null;
  lumberFragile?: boolean | null;
  lumberWeatherSensitive?: boolean | null;
  lumberExportShipment?: boolean | null;
} {
  if (!spec) return {};
  return {
    lumberCategory: spec.productCategory ?? null,
    lumberSpecies: spec.species ?? null,
    lumberGrade: spec.grade ?? null,
    lumberDryness: spec.dryness ?? null,
    lumberTreatment: spec.treatment ?? null,
    lumberPanelType: spec.panelType ?? null,
    lumberNominalSize: spec.nominalSize ?? null,
    lumberLengthFt: typeof spec.lengthFt === "number" ? spec.lengthFt : null,
    lumberPieceCount: typeof spec.pieceCount === "number" ? spec.pieceCount : null,
    lumberBundleCount: typeof spec.bundleCount === "number" ? spec.bundleCount : null,
    lumberMbf: typeof spec.mbf === "number" ? spec.mbf : null,
    lumberPackaging: spec.packaging ?? null,
    lumberLoadingMethod: spec.loadingMethod ?? null,
    lumberFragile: typeof spec.fragile === "boolean" ? spec.fragile : null,
    lumberWeatherSensitive: typeof spec.weatherSensitive === "boolean" ? spec.weatherSensitive : null,
    lumberExportShipment: typeof spec.exportShipment === "boolean" ? spec.exportShipment : null,
  };
}

/**
 * Render a compact list of "pills" describing the lumber spec.
 * Returns an array of string fragments suitable for badge rendering.
 */
export function summarizeLumberSpec(spec: LumberSpec | null | undefined): string[] {
  if (!spec) return [];
  const out: string[] = [];

  if (spec.productCategory) {
    const opt = LUMBER_PRODUCT_CATEGORY_OPTIONS.find((o) => o.value === spec.productCategory);
    out.push(opt?.label.split(" ")[0] ?? spec.productCategory);
  }
  if (spec.species && spec.species !== "OTHER") {
    const opt = LUMBER_SPECIES_OPTIONS.find((o) => o.value === spec.species);
    out.push(opt ? opt.value : spec.species);
  }
  if (spec.nominalSize) out.push(spec.nominalSize);
  if (spec.panelType) {
    const opt = LUMBER_PANEL_TYPE_OPTIONS.find((o) => o.value === spec.panelType);
    if (opt) out.push(opt.label);
  }
  if (spec.panelSize) out.push(spec.panelSize);
  if (typeof spec.lengthFt === "number") out.push(`${spec.lengthFt}ft`);
  else if (spec.lengthsFt && spec.lengthsFt.length) {
    out.push(`${spec.lengthsFt.join("/")}ft`);
  }
  if (spec.dryness) {
    const opt = LUMBER_DRYNESS_OPTIONS.find((o) => o.value === spec.dryness);
    out.push(opt?.value === "GREEN" ? "Green" : opt?.value === "AD" ? "AD" : "KD");
  }
  if (spec.grade) out.push(spec.grade);
  if (spec.treatment && spec.treatment !== "NONE") {
    const opt = LUMBER_TREATMENT_OPTIONS.find((o) => o.value === spec.treatment);
    if (opt) out.push(opt.label.split(" ")[0]);
  }
  if (spec.certifications?.length) {
    out.push(spec.certifications.slice(0, 2).join("/"));
  }
  if (typeof spec.bundleCount === "number" && spec.bundleCount > 0) {
    out.push(`${spec.bundleCount} bdls`);
  } else if (typeof spec.pieceCount === "number" && spec.pieceCount > 0) {
    out.push(`${spec.pieceCount} pcs`);
  }
  if (typeof spec.mbf === "number" && spec.mbf > 0) out.push(`${spec.mbf} MBF`);
  if (spec.exportShipment) out.push("Export");
  if (spec.fragile) out.push("Fragile");
  return out;
}
