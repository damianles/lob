import { readFileSync } from "node:fs";
import path from "node:path";

import zipcodes from "zipcodes";

import { normalizeForDistanceLookup } from "@/lib/postal";

type DieselTable = Record<string, number>;

let cachedUs: DieselTable | null = null;
let cachedCa: DieselTable | null = null;

function loadUsTable(): DieselTable {
  if (cachedUs) return cachedUs;
  const p = path.join(process.cwd(), "data", "diesel-retail-by-state.json");
  const raw = JSON.parse(readFileSync(p, "utf-8")) as Record<string, unknown>;
  const out: DieselTable = {};
  for (const [k, v] of Object.entries(raw)) {
    if (k.startsWith("_")) continue;
    if (typeof v === "number") out[k] = v;
  }
  cachedUs = out;
  return out;
}

function loadCaTable(): DieselTable {
  if (cachedCa) return cachedCa;
  const p = path.join(process.cwd(), "data", "diesel-retail-by-province-ca.json");
  const raw = JSON.parse(readFileSync(p, "utf-8")) as Record<string, unknown>;
  const out: DieselTable = {};
  for (const [k, v] of Object.entries(raw)) {
    if (k.startsWith("_")) continue;
    if (typeof v === "number") out[k] = v;
  }
  cachedCa = out;
  return out;
}

function cadToUsdRate(): number {
  const r = Number(process.env.LOB_CAD_TO_USD_RATE);
  return Number.isFinite(r) && r > 0 ? r : 0.73;
}

/** USD/gallon from Canadian retail $/L (approximate US gallon). */
export function cadPerLitreToUsdPerGallon(cadPerLitre: number): number {
  return cadPerLitre * cadToUsdRate() * 3.78541;
}

export function dieselUsdPerGallonForZip(zip: string): { state: string; usdPerGallon: number; source: string } {
  const z5 = zip.replace(/\D/g, "").slice(0, 5);
  const info = zipcodes.lookup(z5);
  const state = (info?.state ?? "US").toUpperCase();
  const table = loadUsTable();
  const fallback = table.default ?? 3.85;
  const usd = table[state] ?? fallback;
  return {
    state,
    usdPerGallon: usd,
    source: table[state] != null ? "state_table" : "default",
  };
}

export type DieselQuoteUs = {
  country: "US";
  label: string;
  usdPerGallon: number;
  source: string;
};

export type DieselQuoteCa = {
  country: "CA";
  label: string;
  province: string;
  cadPerLitre: number;
  usdPerGallonEquivalent: number;
  source: string;
};

export type DieselQuote = DieselQuoteUs | DieselQuoteCa;

/**
 * Resolve demo diesel pricing from a US ZIP (5 digits) or Canadian postal / FSA.
 */
export function dieselQuoteForPostalInput(raw: string): DieselQuote | null {
  const norm = normalizeForDistanceLookup(raw);
  if (!norm) return null;

  if (/^\d/.test(norm)) {
    const q = dieselUsdPerGallonForZip(norm);
    return {
      country: "US",
      label: q.state,
      usdPerGallon: q.usdPerGallon,
      source: q.source,
    };
  }

  const info = zipcodes.lookup(norm);
  if (!info?.state) return null;
  const province = info.state;
  const ca = loadCaTable();
  const cad = ca[province] ?? ca.default ?? 1.82;
  return {
    country: "CA",
    label: norm,
    province,
    cadPerLitre: cad,
    usdPerGallonEquivalent: cadPerLitreToUsdPerGallon(cad),
    source: ca[province] != null ? "province_table" : "default",
  };
}

export function blendedDieselForPostalEndpoints(originRaw: string, destinationRaw: string) {
  const o = dieselQuoteForPostalInput(originRaw);
  const d = dieselQuoteForPostalInput(destinationRaw);
  if (!o || !d) return null;
  const oUsd = o.country === "US" ? o.usdPerGallon : o.usdPerGallonEquivalent;
  const dUsd = d.country === "US" ? d.usdPerGallon : d.usdPerGallonEquivalent;
  return {
    origin: o,
    destination: d,
    blendedUsdPerGallon: (oUsd + dUsd) / 2,
  };
}
