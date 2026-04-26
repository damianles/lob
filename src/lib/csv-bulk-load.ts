import { z } from "zod";

import { LUMBER_EQUIPMENT_CODES } from "@/lib/lumber-equipment";
import { lumberSpecSchema } from "@/lib/lumber-spec";

/**
 * A small, dependency-free CSV bulk-load pipeline for shippers.
 *
 * Pipeline:
 *   1. parseCsv()             — RFC-4180-ish parser; tolerates CRLF + quoted commas + BOM.
 *   2. normalizeHeaders()     — accepts case/punctuation variants ("Origin City",
 *                                "origin_city", "from city" ↦ "originCity") so mills
 *                                can paste their TMS exports without rewriting.
 *   3. parseBulkLoadRow()     — coerces a single record into a typed payload + Zod-validates it.
 *   4. /api/loads/bulk        — for each VALID row, runs the same shipper-side
 *                                pipeline as POST /api/loads.
 *
 * STABLE WIRE FORMAT — column header keys are part of our public contract.
 * Once mills hardcode their TMS export against these names, renaming costs us
 * support pain. Rules:
 *   - NEVER rename an existing canonical header.
 *   - To rename, add the new name and keep the old as an alias.
 *   - Only ADD new optional columns.
 *
 * Adding a column:
 *   1. Append to BULK_COLUMNS.
 *   2. Add aliases (lower-case, no punctuation) to HEADER_ALIASES.
 *   3. Map it inside parseBulkLoadRow().
 */

export type BulkColumn = {
  /** Canonical CSV header text. Stable, never renamed. */
  header: string;
  required: boolean;
  /** Plain-English help, used in the template instructions row. */
  help: string;
  /** Optional example shown in the template row. */
  example?: string;
};

export const BULK_COLUMNS: BulkColumn[] = [
  { header: "externalRef",        required: false, help: "Your internal load ID / PO / mill ticket. If set, re-uploading the same value is a no-op (idempotent).", example: "PO-2026-00451" },
  { header: "originCity",         required: true,  help: "City the load picks up from",                            example: "Prince George" },
  { header: "originState",        required: true,  help: "2-letter US state or CA province",                       example: "BC" },
  { header: "originZip",          required: true,  help: "Postal/ZIP for the origin (US ZIPs auto-padded to 5 digits)", example: "V2N4M9" },
  { header: "destinationCity",    required: true,  help: "Delivery city",                                           example: "Boise" },
  { header: "destinationState",   required: true,  help: "Delivery state, 2-letter",                                example: "ID" },
  { header: "destinationZip",     required: true,  help: "Delivery ZIP / postal code",                              example: "83702" },
  { header: "weightLbs",          required: true,  help: "Total weight in pounds (integer)",                        example: "44000" },
  { header: "equipmentType",      required: true,  help: "Equipment code: SB, Tri, MX, Tan, CW or a legacy label",  example: "SB" },
  { header: "requestedPickupAt",  required: true,  help: "Pickup date in ISO format YYYY-MM-DD (Excel-friendly). Slash dates (1/2/26) are rejected to avoid mm/dd vs dd/mm ambiguity.", example: "2026-05-12" },
  { header: "offeredRateUsd",     required: true,  help: "Offer rate (decimal); use offerCurrency to denote CAD",   example: "2400" },
  { header: "offerCurrency",      required: false, help: "USD or CAD (defaults to USD)",                            example: "USD" },
  { header: "isRush",             required: false, help: "true / false — rush load?",                              example: "false" },
  { header: "isPrivate",          required: false, help: "true / false — keep off public board?",                  example: "false" },
  { header: "carrierVisibilityMode", required: false, help: "OPEN or TIER_ASSIGNED (default OPEN)",                  example: "OPEN" },
  { header: "loadNotes",          required: false, help: "Optional load-level notes (single line; carrier-visible)", example: "Tarps required" },
  { header: "lumberCategory",     required: false, help: "DIMENSIONAL | BOARDS | TIMBERS | PANELS | ENGINEERED | BUNDLES | POLES | PELLETS | CHIPS | MILLWORK | OTHER", example: "DIMENSIONAL" },
  { header: "lumberSpecies",      required: false, help: "SPF | DF | DF_LARCH | SYP | HEM_FIR | WRC | YELLOW_CEDAR | WHITE_PINE | PONDEROSA | OAK | MAPLE | BIRCH | ASH | POPLAR | MIXED | OTHER", example: "SPF" },
  { header: "lumberGrade",        required: false, help: "Grade text (#2&Btr, Std&Btr, Select Structural…)",        example: "#2&Btr" },
  { header: "lumberDryness",      required: false, help: "GREEN | AD | KD | MC19 | MC15 | MC12",                    example: "MC19" },
  { header: "lumberTreatment",    required: false, help: "NONE | ACQ | MCA | CCA | BORATE | FIRE_RETARDANT | BROWN_STAIN | ANTI_SAPSTAIN", example: "NONE" },
  { header: "lumberPanelType",    required: false, help: "OSB | PLY_SOFT | PLY_HARD | MDF | MDO | HDF | PARTICLEBOARD | LVL | LSL | I_JOIST | GLULAM | CLT", example: "" },
  { header: "lumberNominalSize",  required: false, help: "Free text (e.g., 2x4, 2x6)",                                example: "2x4" },
  { header: "lumberLengthFt",     required: false, help: "Length in feet (decimal); leave blank if mixed lengths",   example: "8" },
  { header: "lumberLengthsFt",    required: false, help: "Mixed lengths in feet, semicolon-separated (e.g., 8;10;12). Overrides lumberLengthFt if both are set.", example: "" },
  { header: "lumberPieceCount",   required: false, help: "Pieces (integer)",                                          example: "5040" },
  { header: "lumberBundleCount",  required: false, help: "Bundles (integer)",                                         example: "84" },
  { header: "lumberMbf",          required: false, help: "Total board-feet in MBF (decimal)",                         example: "26.88" },
  { header: "lumberPackaging",    required: false, help: "STANDARD | PAPER_WRAP | PLASTIC_WRAP | BANDED_ONLY | PALLETIZED | BULK", example: "STANDARD" },
  { header: "lumberLoadingMethod",required: false, help: "SIDE_LOAD | REAR_LOAD | OVERHEAD | LIVE_LOAD | DROP_TRAILER", example: "SIDE_LOAD" },
  { header: "lumberFragile",      required: false, help: "true / false",                                             example: "false" },
  { header: "lumberWeatherSensitive", required: false, help: "true / false",                                         example: "true" },
  { header: "lumberNotes",        required: false, help: "Free-form lumber-spec notes (single line; use semicolons not commas)", example: "" },
];

export const BULK_HEADER_ROW = BULK_COLUMNS.map((c) => c.header);

/** Hard cap on rows per upload — keeps validation/commit fast and DB-friendly. */
export const BULK_MAX_ROWS = 1000;

/**
 * Tolerant header alias map. Keys are *normalized* (lower-case, alphanumerics
 * only — punctuation, spaces, underscores all stripped). Values are canonical
 * column headers from BULK_COLUMNS.
 *
 * Goal: a mill can export their TMS data with column names like
 *   "Origin City", "origin_city", "from_city", "Pickup City"
 * and we map them all to "originCity" without manual mapping UX.
 */
const HEADER_ALIASES: Record<string, string> = {
  // identifiers
  externalref: "externalRef",
  external: "externalRef",
  externalid: "externalRef",
  loadid: "externalRef",
  loadno: "externalRef",
  loadnumber: "externalRef",
  ponumber: "externalRef",
  po: "externalRef",
  ticketnumber: "externalRef",
  millticket: "externalRef",

  // origin
  origincity: "originCity",
  fromcity: "originCity",
  pickupcity: "originCity",
  pucity: "originCity",
  shipcity: "originCity",
  originstate: "originState",
  fromstate: "originState",
  pickupstate: "originState",
  shipstate: "originState",
  originzip: "originZip",
  fromzip: "originZip",
  pickupzip: "originZip",
  shipzip: "originZip",
  originpostal: "originZip",
  originpostalcode: "originZip",

  // destination
  destinationcity: "destinationCity",
  destcity: "destinationCity",
  tocity: "destinationCity",
  deliverycity: "destinationCity",
  consigneecity: "destinationCity",
  destinationstate: "destinationState",
  deststate: "destinationState",
  tostate: "destinationState",
  deliverystate: "destinationState",
  destinationzip: "destinationZip",
  destzip: "destinationZip",
  tozip: "destinationZip",
  deliveryzip: "destinationZip",
  destinationpostal: "destinationZip",
  destinationpostalcode: "destinationZip",

  // payload
  weightlbs: "weightLbs",
  weight: "weightLbs",
  totalweight: "weightLbs",
  grossweightlbs: "weightLbs",
  netweightlbs: "weightLbs",

  // equipment
  equipmenttype: "equipmentType",
  equipment: "equipmentType",
  trailer: "equipmentType",
  trailertype: "equipmentType",

  // dates
  requestedpickupat: "requestedPickupAt",
  pickupdate: "requestedPickupAt",
  pickup: "requestedPickupAt",
  pudate: "requestedPickupAt",
  pickupday: "requestedPickupAt",
  shipdate: "requestedPickupAt",

  // money
  offeredrateusd: "offeredRateUsd",
  rate: "offeredRateUsd",
  rateusd: "offeredRateUsd",
  linehaul: "offeredRateUsd",
  lhrate: "offeredRateUsd",
  carrierrate: "offeredRateUsd",
  payrate: "offeredRateUsd",
  offercurrency: "offerCurrency",
  currency: "offerCurrency",

  // flags
  isrush: "isRush",
  rush: "isRush",
  isprivate: "isPrivate",
  privateload: "isPrivate",
  carriervisibilitymode: "carrierVisibilityMode",
  visibility: "carrierVisibilityMode",

  // notes
  loadnotes: "loadNotes",
  notes: "loadNotes",
  comments: "loadNotes",
  remarks: "loadNotes",

  // lumber spec aliases (loose, all map to canonical)
  lumbercategory: "lumberCategory",
  category: "lumberCategory",
  productcategory: "lumberCategory",
  lumberspecies: "lumberSpecies",
  species: "lumberSpecies",
  lumbergrade: "lumberGrade",
  grade: "lumberGrade",
  lumberdryness: "lumberDryness",
  dryness: "lumberDryness",
  moisture: "lumberDryness",
  lumbertreatment: "lumberTreatment",
  treatment: "lumberTreatment",
  lumberpaneltype: "lumberPanelType",
  paneltype: "lumberPanelType",
  panel: "lumberPanelType",
  lumbernominalsize: "lumberNominalSize",
  nominalsize: "lumberNominalSize",
  size: "lumberNominalSize",
  lumberlengthft: "lumberLengthFt",
  length: "lumberLengthFt",
  lengthft: "lumberLengthFt",
  lumberlengthsft: "lumberLengthsFt",
  lengths: "lumberLengthsFt",
  mixedlengths: "lumberLengthsFt",
  lumberpiececount: "lumberPieceCount",
  pieces: "lumberPieceCount",
  pieccount: "lumberPieceCount",
  lumberbundlecount: "lumberBundleCount",
  bundles: "lumberBundleCount",
  bundlecount: "lumberBundleCount",
  lumbermbf: "lumberMbf",
  mbf: "lumberMbf",
  totalmbf: "lumberMbf",
  lumberpackaging: "lumberPackaging",
  packaging: "lumberPackaging",
  lumberloadingmethod: "lumberLoadingMethod",
  loadingmethod: "lumberLoadingMethod",
  loading: "lumberLoadingMethod",
  lumberfragile: "lumberFragile",
  fragile: "lumberFragile",
  lumberweathersensitive: "lumberWeatherSensitive",
  weathersensitive: "lumberWeatherSensitive",
  lumbernotes: "lumberNotes",
  speccomments: "lumberNotes",
};

/** Strip everything except [a-z0-9] for tolerant header matching. */
function normalizeHeaderKey(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Map a raw header to its canonical name. Returns the original header if no
 * alias matches — the row processor will then ignore it (extra columns are OK).
 */
export function canonicalizeHeader(h: string): string {
  const k = normalizeHeaderKey(h);
  if (HEADER_ALIASES[k]) return HEADER_ALIASES[k];
  // also accept the canonical name in any case (originCity, ORIGINCITY, …)
  for (const c of BULK_COLUMNS) {
    if (normalizeHeaderKey(c.header) === k) return c.header;
  }
  return h;
}

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
 * CRLF, and stray whitespace. Returns an array of records keyed by the
 * canonical header name (so callers can ignore alias logic).
 */
export function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuotes = false;

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
      cur.push(field);
      field = "";
      if (cur.length > 1 || cur[0] !== "") rows.push(cur);
      cur = [];
      if (ch === "\r" && text[i + 1] === "\n") i++;
      continue;
    }
    field += ch;
  }
  if (field !== "" || cur.length > 0) {
    cur.push(field);
    if (cur.length > 1 || cur[0] !== "") rows.push(cur);
  }

  if (rows.length === 0) return { headers: [], rows: [] };

  const rawHeaders = rows[0].map((h) => h.trim());
  const headers = rawHeaders.map(canonicalizeHeader);

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

/* ---------- Date parsing ---------- */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/;
const SLASH_DATE = /^\d{1,2}\/\d{1,2}\/\d{2,4}$/;
const DOT_DATE = /^\d{1,2}\.\d{1,2}\.\d{2,4}$/;

/**
 * Strict pickup-date parser for CSV rows. Returns either a parseable string
 * (ISO 8601) or an error message. We deliberately reject ambiguous formats
 * (slash/dot dates, raw numbers) so we never silently swap month/day.
 */
function validatePickupDateString(input: string): { ok: true; value: string } | { ok: false; error: string } {
  const s = input.trim();
  if (!s) return { ok: false, error: "requestedPickupAt is required" };

  if (ISO_DATE.test(s)) return { ok: true, value: s };
  if (ISO_DATETIME.test(s)) {
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) return { ok: true, value: s };
    return { ok: false, error: `requestedPickupAt "${s}" is not a valid ISO datetime` };
  }
  if (SLASH_DATE.test(s)) {
    return {
      ok: false,
      error: `requestedPickupAt "${s}" uses ambiguous slash format (mm/dd vs dd/mm). Use YYYY-MM-DD instead.`,
    };
  }
  if (DOT_DATE.test(s)) {
    return {
      ok: false,
      error: `requestedPickupAt "${s}" uses ambiguous dotted format. Use YYYY-MM-DD instead.`,
    };
  }
  if (/^\d+(\.\d+)?$/.test(s)) {
    // Excel serial date (days since 1899-12-30).
    return {
      ok: false,
      error: `requestedPickupAt "${s}" looks like an Excel serial date — set the cell format to Text or YYYY-MM-DD before saving.`,
    };
  }
  // Last-ditch: try Date(); if it parses, accept it but only if it's clearly an
  // ISO-y string. We're conservative on purpose.
  return {
    ok: false,
    error: `requestedPickupAt "${s}" is not in YYYY-MM-DD or ISO datetime format`,
  };
}

/* ---------- ZIP normalization ---------- */

/** US state/territory codes (incl. DC) — used to gate ZIP zero-padding. */
const US_STATE_CODES = new Set([
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC","PR","VI","GU","AS","MP",
]);

/**
 * Normalize a US/CA postal code from CSV input.
 * - US states: pad numeric ZIPs to 5 digits (Excel strips leading zeros).
 * - Canada: strip whitespace, upper-case (e.g., "v2n 4m9" → "V2N4M9").
 * - Otherwise: trim + upper-case.
 */
function normalizePostal(raw: string, stateCode: string | undefined): string {
  const s = raw.trim();
  if (!s) return s;
  const state = (stateCode ?? "").toUpperCase();
  if (US_STATE_CODES.has(state) || /^\d{1,5}(?:-\d{4})?$/.test(s)) {
    // Pure-numeric (or US ZIP) — pad to 5 if 3 or 4 digits.
    const m = s.match(/^(\d{1,5})(?:-(\d{4}))?$/);
    if (m) {
      const head = m[1].padStart(5, "0");
      return m[2] ? `${head}-${m[2]}` : head;
    }
  }
  return s.toUpperCase().replace(/\s+/g, "");
}

/* ---------- Per-row validation ---------- */

const BoolyEnum = z.enum(["true", "false", "TRUE", "FALSE", "Yes", "No", "yes", "no", "Y", "N", "y", "n", "1", "0", ""]);

function parseBooly(v: string | undefined, defaultValue: boolean): boolean {
  if (!v) return defaultValue;
  const r = BoolyEnum.safeParse(v);
  if (!r.success) return defaultValue;
  return ["true", "TRUE", "Yes", "yes", "Y", "y", "1"].includes(v);
}

const requiredString = (label: string) => z.string().trim().min(1, `${label} is required`);

const bulkRowSchema = z.object({
  externalRef: z.string().trim().max(120, "externalRef must be ≤ 120 chars").optional().or(z.literal("")),
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
  externalRef?: string;
  loadNotes?: string;
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
    externalRef: (rec.externalRef ?? "").trim(),
    originCity: rec.originCity ?? "",
    originState: rec.originState ?? "",
    originZip: normalizePostal(rec.originZip ?? "", rec.originState),
    destinationCity: rec.destinationCity ?? "",
    destinationState: rec.destinationState ?? "",
    destinationZip: normalizePostal(rec.destinationZip ?? "", rec.destinationState),
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

  const dateCheck = validatePickupDateString(baseParsed.data.requestedPickupAt);
  if (!dateCheck.ok) {
    return { ok: false, rowIndex, errors: [dateCheck.error], raw: rec };
  }

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

  if (rec.lumberLengthsFt) {
    const parts = rec.lumberLengthsFt.split(/[;,]/).map((p) => p.trim()).filter(Boolean);
    const nums: number[] = [];
    for (const p of parts) {
      const n = Number(p);
      if (!Number.isFinite(n) || n <= 0 || n > 100) {
        return {
          ok: false,
          rowIndex,
          errors: [`lumberLengthsFt entry "${p}" must be a positive number ≤ 100`],
          raw: rec,
        };
      }
      nums.push(n);
    }
    if (nums.length) {
      if (nums.length > 20) {
        return {
          ok: false,
          rowIndex,
          errors: ["lumberLengthsFt: at most 20 lengths supported per load"],
          raw: rec,
        };
      }
      setIf("lengthsFt", nums);
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
  const loadNotes = (rec.loadNotes ?? "").trim();

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

  if (loadNotes) {
    extendedPosting = { ...(extendedPosting ?? {}), notes: loadNotes };
  }

  const externalRef = baseParsed.data.externalRef ? baseParsed.data.externalRef.trim() : undefined;

  return {
    ok: true,
    rowIndex,
    data: {
      ...baseParsed.data,
      externalRef: externalRef || undefined,
      loadNotes: loadNotes || undefined,
      // overwrite with normalized postal codes
      originZip: baseInput.originZip,
      destinationZip: baseInput.destinationZip,
      extendedPosting,
    },
  };
}

/**
 * Parse all rows. Detects:
 *   - row count > BULK_MAX_ROWS (returns error rows for the overflow)
 *   - duplicate externalRef *within* the same upload (we keep the first, flag the rest)
 *   - duplicate (originCity+state, destinationCity+state, requestedPickupAt, offeredRateUsd)
 *     when externalRef is empty — heuristic to catch accidental copy-paste duplicates.
 */
export function parseAllRows(rows: Record<string, string>[]): BulkRowResult[] {
  const sliced = rows.slice(0, BULK_MAX_ROWS);
  const results: BulkRowResult[] = sliced.map((r, i) => parseBulkLoadRow(r, i + 1));

  // Within-file duplicate detection.
  const seenExt = new Map<string, number>();
  const seenHeuristic = new Map<string, number>();
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (!r.ok) continue;
    const ext = r.data.externalRef;
    if (ext) {
      const dupRow = seenExt.get(ext);
      if (dupRow != null) {
        results[i] = {
          ok: false,
          rowIndex: r.rowIndex,
          errors: [`Duplicate externalRef "${ext}" — first seen on row ${dupRow}`],
          raw: sliced[i],
        };
        continue;
      }
      seenExt.set(ext, r.rowIndex);
    } else {
      const key = [
        r.data.originCity.toLowerCase(),
        r.data.originState,
        r.data.destinationCity.toLowerCase(),
        r.data.destinationState,
        r.data.requestedPickupAt,
        r.data.offeredRateUsd,
      ].join("|");
      const dupRow = seenHeuristic.get(key);
      if (dupRow != null) {
        results[i] = {
          ok: false,
          rowIndex: r.rowIndex,
          errors: [
            `Looks like a duplicate of row ${dupRow} (same lane / pickup / rate). Add an externalRef if these really are different loads.`,
          ],
          raw: sliced[i],
        };
        continue;
      }
      seenHeuristic.set(key, r.rowIndex);
    }
  }

  // Overflow rows.
  if (rows.length > BULK_MAX_ROWS) {
    for (let i = BULK_MAX_ROWS; i < rows.length; i++) {
      results.push({
        ok: false,
        rowIndex: i + 1,
        errors: [`Row ${i + 1}: file exceeds the ${BULK_MAX_ROWS}-row limit per upload. Split into smaller files.`],
        raw: rows[i],
      });
    }
  }

  return results;
}

/* ---------- Error CSV (download "fix and retry") ---------- */

/**
 * Build a CSV containing only invalid rows + a final "_errors" column,
 * preserving the canonical column order. Users open it, fix the cells,
 * and re-upload — friction-free retry loop.
 */
export function buildErrorReportCsv(results: BulkRowResult[]): string {
  const invalid = results.filter((r): r is Extract<BulkRowResult, { ok: false }> => !r.ok);
  if (!invalid.length) return "";
  const headers = [...BULK_HEADER_ROW, "_errors"];
  const lines = [headers.map(csvEscape).join(",")];
  for (const r of invalid) {
    const cells = BULK_HEADER_ROW.map((h) => csvEscape(r.raw?.[h] ?? ""));
    cells.push(csvEscape(r.errors.join(" · ")));
    lines.push(cells.join(","));
  }
  return `${lines.join("\n")}\n`;
}
