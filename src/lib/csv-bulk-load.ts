import { z } from "zod";

import { LUMBER_EQUIPMENT_CODES } from "@/lib/lumber-equipment";
import { lumberSpecSchema } from "@/lib/lumber-spec";

/**
 * A small, dependency-free CSV bulk-load pipeline for shippers.
 *
 * The whole point: shippers should NOT have free-form data entry that
 * leaves us cleaning their messes later. So the CSV format is locked,
 * every row passes through Zod, and the upload UI shows row-level errors
 * before anything is written.
 *
 * Pipeline:
 *   1. parseCsv()           — strict RFC-4180-ish parser; tolerant of CRLF + quoted commas.
 *   2. parseBulkLoadRow()   — coerces a single record into a typed payload + Zod-validates it.
 *   3. /api/loads/bulk      — for each VALID row, runs the same shipper-side pipeline as POST /api/loads.
 *
 * Adding a column: append it to BULK_COLUMNS, BULK_COLUMN_HELP, and parseBulkLoadRow().
 */

export type BulkColumn = {
  /** CSV header text exactly as written. */
  header: string;
  required: boolean;
  /** Plain-English help, used in the template instructions row. */
  help: string;
  /** Optional example shown in the template row. */
  example?: string;
};

export const BULK_COLUMNS: BulkColumn[] = [
  { header: "originCity",         required: true,  help: "City the load picks up from",                            example: "Prince George" },
  { header: "originState",        required: true,  help: "2-letter US state or CA province",                       example: "BC" },
  { header: "originZip",          required: true,  help: "Postal/ZIP for the origin",                              example: "V2N4M9" },
  { header: "destinationCity",    required: true,  help: "Delivery city",                                           example: "Boise" },
  { header: "destinationState",   required: true,  help: "Delivery state, 2-letter",                                example: "ID" },
  { header: "destinationZip",     required: true,  help: "Delivery ZIP / postal code",                              example: "83702" },
  { header: "weightLbs",          required: true,  help: "Total weight in pounds (integer)",                        example: "44000" },
  { header: "equipmentType",      required: true,  help: "Equipment code: SB, Tri, MX, Tan, CW or a legacy label",  example: "SB" },
  { header: "requestedPickupAt",  required: true,  help: "Pickup date YYYY-MM-DD or ISO timestamp",                  example: "2026-05-12" },
  { header: "offeredRateUsd",     required: true,  help: "Offer rate (decimal); use offerCurrency to denote CAD",   example: "2400" },
  { header: "offerCurrency",      required: false, help: "USD or CAD (defaults to USD)",                            example: "USD" },
  { header: "isRush",             required: false, help: "true / false — rush load?",                              example: "false" },
  { header: "isPrivate",          required: false, help: "true / false — keep off public board?",                  example: "false" },
  { header: "carrierVisibilityMode", required: false, help: "OPEN or TIER_ASSIGNED (default OPEN)",                  example: "OPEN" },
  { header: "lumberCategory",     required: false, help: "DIMENSIONAL | BOARDS | TIMBERS | PANELS | ENGINEERED | BUNDLES | POLES | PELLETS | CHIPS | MILLWORK | OTHER", example: "DIMENSIONAL" },
  { header: "lumberSpecies",      required: false, help: "SPF | DF | DF_LARCH | SYP | HEM_FIR | WRC | YELLOW_CEDAR | WHITE_PINE | PONDEROSA | OAK | MAPLE | BIRCH | ASH | POPLAR | MIXED | OTHER", example: "SPF" },
  { header: "lumberGrade",        required: false, help: "Grade text (#2&Btr, Std&Btr, Select Structural…)",        example: "#2&Btr" },
  { header: "lumberDryness",      required: false, help: "GREEN | AD | KD | MC19 | MC15 | MC12",                    example: "MC19" },
  { header: "lumberTreatment",    required: false, help: "NONE | ACQ | MCA | CCA | BORATE | FIRE_RETARDANT | BROWN_STAIN | ANTI_SAPSTAIN", example: "NONE" },
  { header: "lumberPanelType",    required: false, help: "OSB | PLY_SOFT | PLY_HARD | MDF | MDO | HDF | PARTICLEBOARD | LVL | LSL | I_JOIST | GLULAM | CLT", example: "" },
  { header: "lumberNominalSize",  required: false, help: "Free text (e.g., 2x4, 2x6)",                                example: "2x4" },
  { header: "lumberLengthFt",     required: false, help: "Length in feet (decimal); leave blank if mixed lengths",   example: "8" },
  { header: "lumberPieceCount",   required: false, help: "Pieces (integer)",                                          example: "5040" },
  { header: "lumberBundleCount",  required: false, help: "Bundles (integer)",                                         example: "84" },
  { header: "lumberMbf",          required: false, help: "Total board-feet in MBF (decimal)",                         example: "26.88" },
  { header: "lumberPackaging",    required: false, help: "STANDARD | PAPER_WRAP | PLASTIC_WRAP | BANDED_ONLY | PALLETIZED | BULK", example: "STANDARD" },
  { header: "lumberLoadingMethod",required: false, help: "SIDE_LOAD | REAR_LOAD | OVERHEAD | LIVE_LOAD | DROP_TRAILER", example: "SIDE_LOAD" },
  { header: "lumberFragile",      required: false, help: "true / false",                                             example: "false" },
  { header: "lumberWeatherSensitive", required: false, help: "true / false",                                         example: "true" },
  { header: "lumberNotes",        required: false, help: "Free-form notes (single line; use semicolons not commas)", example: "" },
];

export const BULK_HEADER_ROW = BULK_COLUMNS.map((c) => c.header);

/**
 * Renders the downloadable CSV template — header row + an example row.
 * Stays browser-friendly with a UTF-8 BOM for Excel.
 */
export function buildTemplateCsv(): string {
  const headers = BULK_COLUMNS.map((c) => csvEscape(c.header)).join(",");
  const example = BULK_COLUMNS.map((c) => csvEscape(c.example ?? "")).join(",");
  return `${headers}\n${example}\n`;
}

/**
 * Renders a help/legend CSV (header + one help row per column) so users have
 * an in-spreadsheet description without us maintaining a separate doc.
 */
export function buildTemplateHelpCsv(): string {
  const headers = BULK_COLUMNS.map((c) => csvEscape(c.header)).join(",");
  const helpRow = BULK_COLUMNS.map((c) => csvEscape(`${c.required ? "required: " : ""}${c.help}`)).join(",");
  return `${headers}\n${helpRow}\n`;
}

function csvEscape(v: string): string {
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

/**
 * Tiny RFC-4180-ish CSV parser. Handles quoted fields, escaped quotes,
 * CRLF, and stray whitespace. Returns an array of records keyed by header.
 */
export function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuotes = false;

  // Strip BOM
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === "\"") {
        if (text[i + 1] === "\"") {
          field += "\"";
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === "\"") {
      inQuotes = true;
      continue;
    }
    if (ch === ",") {
      cur.push(field);
      field = "";
      continue;
    }
    if (ch === "\n" || ch === "\r") {
      // newline: push field, push row (if not empty), skip CRLF
      cur.push(field);
      field = "";
      if (cur.length > 1 || cur[0] !== "") rows.push(cur);
      cur = [];
      if (ch === "\r" && text[i + 1] === "\n") i++;
      continue;
    }
    field += ch;
  }
  // tail
  if (field !== "" || cur.length > 0) {
    cur.push(field);
    if (cur.length > 1 || cur[0] !== "") rows.push(cur);
  }

  if (rows.length === 0) return { headers: [], rows: [] };
  const headers = rows[0].map((h) => h.trim());
  const out: Record<string, string>[] = [];
  for (let r = 1; r < rows.length; r++) {
    const rec: Record<string, string> = {};
    for (let c = 0; c < headers.length; c++) {
      rec[headers[c]] = (rows[r][c] ?? "").trim();
    }
    out.push(rec);
  }
  return { headers, rows: out };
}

/* ---------- Per-row validation ---------- */

const BoolyEnum = z.enum(["true", "false", "TRUE", "FALSE", "Yes", "No", "yes", "no", "1", "0", ""]);

function parseBooly(v: string | undefined, defaultValue: boolean): boolean {
  if (!v) return defaultValue;
  const r = BoolyEnum.safeParse(v);
  if (!r.success) return defaultValue;
  return ["true", "TRUE", "Yes", "yes", "1"].includes(v);
}

const requiredString = (label: string) => z.string().trim().min(1, `${label} is required`);

const bulkRowSchema = z.object({
  originCity: requiredString("originCity"),
  originState: requiredString("originState").transform((s) => s.toUpperCase()).pipe(z.string().length(2, "originState must be 2 letters")),
  originZip: requiredString("originZip").pipe(z.string().min(3).max(12)),
  destinationCity: requiredString("destinationCity"),
  destinationState: requiredString("destinationState").transform((s) => s.toUpperCase()).pipe(z.string().length(2, "destinationState must be 2 letters")),
  destinationZip: requiredString("destinationZip").pipe(z.string().min(3).max(12)),
  weightLbs: z.coerce.number().int().positive("weightLbs must be a positive integer"),
  equipmentType: requiredString("equipmentType").refine(
    (s) => LUMBER_EQUIPMENT_CODES.has(s) || s.length >= 3,
    "Use a lumber equipment code (SB, Tri, MX, Tan, CW) or a legacy type",
  ),
  requestedPickupAt: requiredString("requestedPickupAt").pipe(z.string().min(8)),
  offeredRateUsd: z.coerce.number().positive("offeredRateUsd must be > 0"),
  offerCurrency: z.enum(["USD", "CAD"]).default("USD"),
  isRush: z.boolean().default(false),
  isPrivate: z.boolean().default(false),
  carrierVisibilityMode: z.enum(["OPEN", "TIER_ASSIGNED"]).default("OPEN"),
});

export type BulkLoadRowParsed = z.infer<typeof bulkRowSchema> & {
  extendedPosting?: Record<string, unknown>;
};

export type BulkRowResult =
  | { ok: true; rowIndex: number; data: BulkLoadRowParsed }
  | { ok: false; rowIndex: number; errors: string[]; raw: Record<string, string> };

export function parseBulkLoadRow(
  rec: Record<string, string>,
  rowIndex: number,
): BulkRowResult {
  const baseInput = {
    originCity: rec.originCity ?? "",
    originState: rec.originState ?? "",
    originZip: rec.originZip ?? "",
    destinationCity: rec.destinationCity ?? "",
    destinationState: rec.destinationState ?? "",
    destinationZip: rec.destinationZip ?? "",
    weightLbs: rec.weightLbs ?? "",
    equipmentType: rec.equipmentType ?? "",
    requestedPickupAt: rec.requestedPickupAt ?? "",
    offeredRateUsd: rec.offeredRateUsd ?? "",
    offerCurrency: (rec.offerCurrency || "USD") as "USD" | "CAD",
    isRush: parseBooly(rec.isRush, false),
    isPrivate: parseBooly(rec.isPrivate, false),
    carrierVisibilityMode: (rec.carrierVisibilityMode || "OPEN") as "OPEN" | "TIER_ASSIGNED",
  };

  const baseParsed = bulkRowSchema.safeParse(baseInput);
  if (!baseParsed.success) {
    const errs = baseParsed.error.issues.map((i) => `${i.path.join(".") || "row"}: ${i.message}`);
    return { ok: false, rowIndex, errors: errs, raw: rec };
  }

  // Optional lumber spec
  const lumberCandidate: Record<string, unknown> = {};
  let hasAnyLumber = false;

  function setIf<K extends string>(key: K, val: unknown) {
    if (val === undefined || val === null || val === "") return;
    lumberCandidate[key] = val;
    hasAnyLumber = true;
  }

  setIf("productCategory", rec.lumberCategory);
  setIf("species", rec.lumberSpecies);
  setIf("grade", rec.lumberGrade);
  setIf("dryness", rec.lumberDryness);
  setIf("treatment", rec.lumberTreatment);
  setIf("panelType", rec.lumberPanelType);
  setIf("nominalSize", rec.lumberNominalSize);

  if (rec.lumberLengthFt) {
    const n = Number(rec.lumberLengthFt);
    if (Number.isFinite(n) && n > 0) {
      setIf("lengthFt", n);
    } else {
      return { ok: false, rowIndex, errors: ["lumberLengthFt must be a positive number"], raw: rec };
    }
  }

  if (rec.lumberPieceCount) {
    const n = Number(rec.lumberPieceCount);
    if (Number.isFinite(n) && n > 0) {
      setIf("pieceCount", Math.round(n));
    } else {
      return { ok: false, rowIndex, errors: ["lumberPieceCount must be a positive integer"], raw: rec };
    }
  }
  if (rec.lumberBundleCount) {
    const n = Number(rec.lumberBundleCount);
    if (Number.isFinite(n) && n > 0) {
      setIf("bundleCount", Math.round(n));
    } else {
      return { ok: false, rowIndex, errors: ["lumberBundleCount must be a positive integer"], raw: rec };
    }
  }
  if (rec.lumberMbf) {
    const n = Number(rec.lumberMbf);
    if (Number.isFinite(n) && n > 0) {
      setIf("mbf", n);
    } else {
      return { ok: false, rowIndex, errors: ["lumberMbf must be a positive number"], raw: rec };
    }
  }

  setIf("packaging", rec.lumberPackaging);
  setIf("loadingMethod", rec.lumberLoadingMethod);
  if (rec.lumberFragile) setIf("fragile", parseBooly(rec.lumberFragile, false));
  if (rec.lumberWeatherSensitive) setIf("weatherSensitive", parseBooly(rec.lumberWeatherSensitive, false));
  setIf("notes", rec.lumberNotes);

  let extendedPosting: Record<string, unknown> | undefined = undefined;
  if (hasAnyLumber) {
    const lumberRes = lumberSpecSchema.safeParse(lumberCandidate);
    if (!lumberRes.success) {
      return {
        ok: false,
        rowIndex,
        errors: lumberRes.error.issues.map((i) => `lumber.${i.path.join(".")}: ${i.message}`),
        raw: rec,
      };
    }
    extendedPosting = { lumber: lumberRes.data };
  }

  return {
    ok: true,
    rowIndex,
    data: { ...baseParsed.data, extendedPosting },
  };
}

export function parseAllRows(rows: Record<string, string>[]): BulkRowResult[] {
  return rows.map((r, i) => parseBulkLoadRow(r, i + 1));
}
