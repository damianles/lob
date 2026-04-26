/**
 * Saved searches for the carrier-side load board.
 *
 * No DB migration: we keep these in localStorage keyed per signed-in user
 * (Clerk's authProviderId is not available client-side here, so we use a
 * stable browser-local key plus the user's company id when available).
 *
 * Future migration path: when we promote this to a Prisma model, the same
 * shape is used so we can serialize-then-write directly.
 */

export type SavedSearchPayload = {
  originQ?: string;
  destQ?: string;
  equipmentFilter?: string;
  weightMin?: string;
  weightMax?: string;
  pickupFrom?: string;
  pickupTo?: string;
  hideBrokers?: boolean;
  /** Minimum offered rate USD-equivalent (filter; client-side only). */
  minRateUsd?: number;
  lumberSpecies?: string;
  lumberPanelType?: string;
  lumberTreatment?: string;
  lumberFragileOnly?: boolean;
  lumberWeatherSensitiveOnly?: boolean;
};

export type SavedSearch = {
  id: string;
  name: string;
  /** Owner namespace — currently a company id (carrier). Empty string allowed for guests. */
  ownerKey: string;
  createdAt: string;
  /** ISO timestamp of the last time the user opened/applied this search.
   *  Used to compute "N new matches since you last looked" badges. */
  lastViewedAt?: string;
  payload: SavedSearchPayload;
};

const STORAGE_KEY = "lob.savedSearches.v1";

function readAll(): SavedSearch[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? (v as SavedSearch[]) : [];
  } catch {
    return [];
  }
}

function writeAll(list: SavedSearch[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function listSavedSearches(ownerKey: string): SavedSearch[] {
  return readAll()
    .filter((s) => s.ownerKey === ownerKey)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function saveSearch(ownerKey: string, name: string, payload: SavedSearchPayload): SavedSearch {
  const all = readAll();
  const item: SavedSearch = {
    id: `ss_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    name: name.trim() || "Untitled search",
    ownerKey,
    createdAt: new Date().toISOString(),
    payload,
  };
  writeAll([item, ...all]);
  return item;
}

export function deleteSavedSearch(id: string) {
  const all = readAll().filter((s) => s.id !== id);
  writeAll(all);
}

/** Update lastViewedAt = now for one saved search; safely no-ops on miss. */
export function markSearchViewed(id: string) {
  const all = readAll();
  const idx = all.findIndex((s) => s.id === id);
  if (idx < 0) return;
  all[idx] = { ...all[idx], lastViewedAt: new Date().toISOString() };
  writeAll(all);
}

export function summarizeSearch(p: SavedSearchPayload): string {
  const bits: string[] = [];
  if (p.originQ) bits.push(`from "${p.originQ}"`);
  if (p.destQ) bits.push(`to "${p.destQ}"`);
  if (p.equipmentFilter) bits.push(p.equipmentFilter);
  if (p.weightMin || p.weightMax) bits.push(`${p.weightMin || "0"}–${p.weightMax || "∞"} lbs`);
  if (p.pickupFrom || p.pickupTo) bits.push(`pickup ${p.pickupFrom || "…"}→${p.pickupTo || "…"}`);
  if (p.minRateUsd) bits.push(`min $${p.minRateUsd}`);
  if (p.hideBrokers) bits.push("hide brokers");
  if (p.lumberSpecies) bits.push(p.lumberSpecies);
  if (p.lumberPanelType) bits.push(p.lumberPanelType);
  if (p.lumberTreatment && p.lumberTreatment !== "NONE") bits.push(p.lumberTreatment);
  if (p.lumberFragileOnly) bits.push("fragile");
  if (p.lumberWeatherSensitiveOnly) bits.push("weather-sensitive");
  return bits.join(" · ") || "no filters";
}
