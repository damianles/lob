"use client";

import { useEffect, useState } from "react";

import {
  deleteSavedSearch,
  listSavedSearches,
  saveSearch,
  summarizeSearch,
  type SavedSearch,
  type SavedSearchPayload,
} from "@/lib/saved-searches";

type Props = {
  ownerKey: string;
  currentPayload: SavedSearchPayload;
  onApply: (p: SavedSearchPayload) => void;
};

/**
 * Carrier saved-search bar. Persists to localStorage so we don't need a
 * Prisma migration; can be lifted to a server model later without changing
 * the API shape.
 */
export function SavedSearchesBar({ ownerKey, currentPayload, onApply }: Props) {
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
        {list.map((s) => (
          <div
            key={s.id}
            className="group inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-900 ring-1 ring-emerald-200"
          >
            <button
              type="button"
              onClick={() => onApply(s.payload)}
              className="hover:underline"
              title={summarizeSearch(s.payload)}
            >
              {s.name}
            </button>
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
        ))}
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
