import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

type AliasMap = Record<string, string>;

let aliasCache: AliasMap | null = null;

function loadAliases(): AliasMap {
  if (aliasCache) return aliasCache;
  const p = path.join(process.cwd(), "data", "city-aliases.json");
  if (!existsSync(p)) {
    aliasCache = {};
    return aliasCache;
  }
  try {
    const raw = JSON.parse(readFileSync(p, "utf-8")) as Record<string, string>;
    aliasCache = {};
    for (const [k, v] of Object.entries(raw)) {
      aliasCache[k.trim().toLowerCase()] = v.trim().toLowerCase().replace(/\s+/g, " ");
    }
    return aliasCache;
  } catch {
    aliasCache = {};
    return aliasCache;
  }
}

/**
 * Single key for matching lanes across spelling variants (Ft / Fort, St / Saint, punctuation).
 * Used for benchmarks, DB observations, and spreadsheet import grouping.
 */
export function canonicalCityKey(raw: string): string {
  let s = String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

  s = s.replace(/\bft\.\s*/g, "fort ");
  s = s.replace(/\bft\s+/g, "fort ");
  s = s.replace(/\bst\.\s*/g, "saint ");
  s = s.replace(/\bst\s+/g, "saint ");
  s = s.replace(/\bmt\.\s*/g, "mount ");
  s = s.replace(/\bmt\s+/g, "mount ");

  s = s.replace(/[^a-z0-9\s-]/g, "");
  s = s.replace(/\s+/g, " ").trim();

  const aliases = loadAliases();
  return aliases[s] ?? s;
}
