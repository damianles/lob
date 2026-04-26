"use client";

import { useEffect, useMemo, useState } from "react";

import {
  deleteSavedSearch,
  listSavedSearches,
  markSearchViewed,
  saveSearch,
  summarizeSearch,
  type SavedSearch,
  type SavedSearchPayload,
} from "@/lib/saved-searches";

/** Minimum shape needed to evaluate "N new matches since last viewed". */
export type SavedSearchLoadStub = {
  id: string;
  /** ISO timestamp; matching loads newer than `lastViewedAt` count as "new". */
  createdAt: string;
};

type Props = {
  ownerKey: string;
  currentPayload: SavedSearchPayload;
  onApply: (p: SavedSearchPayload) => void;
  /** Optional: pass current visible loads + a matcher to enable "N new" badges. */
  currentLoads?: SavedSearchLoadStub[];
  evaluateMatch?: (payload: SavedSearchPayload, load: SavedSearchLoadStub) => boolean;
};

/**
 * Carrier saved-search bar. Persists to localStorage so we don't need a
 * Prisma migration; can be lifted to a server model later without changing
 * the API shape.
 *
 * When `currentLoads` + `evaluateMatch` are provided, each saved search shows
 * an "N new" badge counting matching loads posted since the user last applied
 * that search.
 */
export function SavedSearchesBar({
  ownerKey,
  currentPayload,
  onApply,
  currentLoads,
  evaluateMatch,
}: Props) {
  const [list, setList] = useState<SavedSearch[]>([]);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setList(listSavedSearches(ownerKey));
    setHydrated(true);
  }, [ownerKey]);

  function refresh() {
    setList(listSavedSearches(ownerKey));
  }

  function onSave() {
    if (!name.trim()) return;
    saveSearch(ownerKey, name, currentPayload);
    setName("");
    setNaming(false);
    refresh();
  }

  /** Pre-compute "N new" counts only when both inputs are wired. */
  const newCounts = useMemo(() => {
    if (!currentLoads || !evaluateMatch) return new Map<string, number>();
    const m = new Map<string, number>();
    for (const s of list) {
      const since = s.lastViewedAt ? new Date(s.lastViewedAt).getTime() : 0;
      let n = 0;
      for (const l of currentLoads) {
        if (new Date(l.createdAt).getTime() <= since) continue;
        if (evaluateMatch(s.payload, l)) n += 1;
      }
      m.set(s.id, n);
    }
    return m;
  }, [list, currentLoads, evaluateMatch]);

  if (!hydrated) return null;

  return (
    <div className="rounded-lg border border-stone-200 bg-white px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">
          Saved searches
        </span>
        {list.length === 0 && (
          <span className="text-[11px] text-stone-500">
            None yet. Save your usual lane + equipment combo for one-click recall.
          </span>
        )}
        {list.map((s) => {
          const n = newCounts.get(s.id) ?? 0;
          return (
            <div
              key={s.id}
              className="group inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-900 ring-1 ring-emerald-200"
            >
              <button
                type="button"
                onClick={() => {
                  markSearchViewed(s.id);
                  refresh();
                  onApply(s.payload);
                }}
                className="hover:underline"
                title={summarizeSearch(s.payload)}
              >
                {s.name}
              </button>
              {n > 0 && (
                <span
                  className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-amber-500 px-1 py-[1px] text-[10px] font-bold leading-none text-white"
                  title={`${n} new ${n === 1 ? "match" : "matches"} since you last viewed this saved search`}
                >
                  {n}
                </span>
              )}
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Delete saved search "${s.name}"?`)) {
                    deleteSavedSearch(s.id);
                    refresh();
                  }
                }}
                className="text-emerald-700/70 opacity-0 transition group-hover:opacity-100 hover:text-rose-700"
                title="Delete"
              >
                ✕
              </button>
            </div>
          );
        })}
        {!naming ? (
          <button
            type="button"
            onClick={() => setNaming(true)}
            className="ml-auto rounded-md border border-stone-300 px-2 py-0.5 text-[11px] font-semibold text-stone-700 hover:bg-stone-50"
          >
            + Save current
          </button>
        ) : (
          <div className="ml-auto flex items-center gap-1.5">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSave();
                if (e.key === "Escape") {
                  setNaming(false);
                  setName("");
                }
              }}
              placeholder="e.g. PG → Boise · Tri-axle"
              className="rounded border border-stone-300 px-2 py-0.5 text-xs"
            />
            <button
              type="button"
              onClick={onSave}
              disabled={!name.trim()}
              className="rounded-md bg-emerald-700 px-2 py-0.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setNaming(false);
                setName("");
              }}
              className="rounded-md border border-stone-300 px-2 py-0.5 text-xs text-stone-700"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
