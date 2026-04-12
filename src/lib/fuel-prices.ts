import { readFileSync } from "node:fs";
import path from "node:path";

import zipcodes from "zipcodes";

type DieselTable = Record<string, number>;

let cached: DieselTable | null = null;

function loadTable(): DieselTable {
  if (cached) return cached;
  const p = path.join(process.cwd(), "data", "diesel-retail-by-state.json");
  const raw = JSON.parse(readFileSync(p, "utf-8")) as Record<string, unknown>;
  const out: DieselTable = {};
  for (const [k, v] of Object.entries(raw)) {
    if (k.startsWith("_")) continue;
    if (typeof v === "number") out[k] = v;
  }
  cached = out;
  return out;
}

export function dieselUsdPerGallonForZip(zip: string): { state: string; usdPerGallon: number; source: string } {
  const z5 = zip.replace(/\D/g, "").slice(0, 5);
  const info = zipcodes.lookup(z5);
  const state = (info?.state ?? "US").toUpperCase();
  const table = loadTable();
  const fallback = table.default ?? 3.85;
  const usd = table[state] ?? fallback;
  return {
    state,
    usdPerGallon: usd,
    source: table[state] != null ? "state_table" : "default",
  };
}

export function blendedDieselForLane(originZip: string, destinationZip: string) {
  const o = dieselUsdPerGallonForZip(originZip);
  const d = dieselUsdPerGallonForZip(destinationZip);
  const blended = (o.usdPerGallon + d.usdPerGallon) / 2;
  return {
    origin: o,
    destination: d,
    blendedUsdPerGallon: blended,
  };
}
