"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

import type { ParsedPlace } from "@/lib/google-place";

type Mode = "city" | "address" | "geocode";

const DEBOUNCE_MS = 280;

type DetailsPayload = ParsedPlace & { lat: number | null; lng: number | null; name: string | null };

/**
 * Type-ahead + dropdown backed by /api/places (Google Places, server key).
 * When a row is selected, fetches place details and calls `onResolved` with city/state/zip/line1.
 * If the API is not configured, shows a one-line note and no network calls.
 */
export function PlaceAutocomplete({
  mode = "city",
  label,
  onResolved,
  onUnavailable,
  className = "",
  disabled = false,
  placeholder = "Start typing a city, ZIP, or address…",
}: {
  mode?: Mode;
  label: string;
  onResolved: (p: DetailsPayload) => void;
  /** Called when server returns 503 (no key) on first use */
  onUnavailable?: () => void;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
}) {
  const id = useId();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [predictions, setPredictions] = useState<{ placeId: string; label: string }[]>([]);
  const [warn, setWarn] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const runSearch = useCallback(
    (input: string) => {
      if (unavailable) return;
      if (input.trim().length < 2) {
        setPredictions([]);
        return;
      }
      setLoading(true);
      const params = new URLSearchParams({ q: input, mode });
      void fetch(`/api/places/autocomplete?${params}`)
        .then(async (r) => {
          if (r.status === 503) {
            setUnavailable(true);
            setPredictions([]);
            onUnavailable?.();
            return;
          }
          const j = (await r.json().catch(() => ({}))) as
            | { predictions?: { placeId: string; label: string }[] }
            | { error?: string };
          if (r.ok && "predictions" in j && j.predictions) {
            setPredictions(j.predictions);
            setWarn(null);
          } else {
            setPredictions([]);
            setWarn("Could not load places suggestions.");
          }
        })
        .catch(() => setPredictions([]))
        .finally(() => setLoading(false));
    },
    [mode, onUnavailable, unavailable],
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void runSearch(q);
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q, runSearch]);

  const pick = useCallback(
    (placeId: string) => {
      setOpen(false);
      setLoading(true);
      void fetch(`/api/places/details?placeId=${encodeURIComponent(placeId)}`)
        .then(async (r) => {
          if (!r.ok) {
            setWarn("Could not load this place. Try again.");
            return;
          }
          const j = (await r.json().catch(() => ({}))) as { data?: DetailsPayload };
          if (j.data) onResolved(j.data);
        })
        .finally(() => setLoading(false));
    },
    [onResolved],
  );

  return (
    <div className={`relative ${className}`}>
      <label htmlFor={id} className="mb-0.5 block text-xs font-medium text-zinc-600">
        {label}
      </label>
      <input
        id={id}
        type="search"
        autoComplete="off"
        disabled={disabled}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          // Delay so mousedown on option registers
          setTimeout(() => setOpen(false), 180);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder={unavailable ? "Place search is not configured" : placeholder}
        className="w-full min-w-0 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-stone-400 focus:border-lob-navy/40 focus:outline-none focus:ring-2 focus:ring-lob-navy/15"
      />
      {warn && <p className="mt-1 text-[11px] text-amber-800">{warn}</p>}
      {unavailable && (
        <p className="mt-1 text-[11px] text-stone-500">
          Set <code className="rounded bg-stone-100 px-0.5">GOOGLE_MAPS_API_KEY</code> and enable Places
          (Autocomplete + Details) for that key, then redeploy. You can still type the lane manually.
        </p>
      )}
      {open && predictions.length > 0 && !unavailable && (
        <ul
          ref={listRef}
          className="absolute z-[80] mt-1 max-h-60 w-full overflow-auto rounded-lg border border-stone-200 bg-white py-1 text-sm shadow-lg"
          role="listbox"
        >
          {loading && <li className="px-3 py-2 text-stone-500">Loading…</li>}
          {predictions.map((p) => (
            <li key={p.placeId}>
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-stone-800 hover:bg-stone-50"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setQ(p.label);
                  pick(p.placeId);
                }}
              >
                {p.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
