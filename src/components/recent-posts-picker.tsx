"use client";

import { useEffect, useState } from "react";

import type { LoadTemplate } from "@/components/load-templates-panel";

/**
 * "Recent posts" widget on the supplier post-load form.
 *
 * Calls /api/loads/recent and surfaces the last 5 loads as compact
 * Repost buttons. Clicking one populates the form with the same fields a
 * saved template would — no need to save a template if the mill just wants
 * to re-up a recent load.
 *
 * The shape is intentionally identical to LoadTemplate so the parent form
 * can reuse the same `onLoad(t)` callback for both pickers.
 */

type RecentPost = LoadTemplate & {
  /** ISO datetime — used to render "2 hr ago" / "yesterday". */
  createdAt: string;
  /** Original LOB reference for the listed load (display only). */
  referenceNumber?: string;
};

type ApiRow = Omit<RecentPost, "name" | "shortLabel"> & {
  /**
   * The recent-posts API doesn't carry name/shortLabel — they're synthesized
   * client-side from the lane summary so the picker reads naturally.
   */
};

type Props = {
  onLoad: (t: LoadTemplate) => void;
};

function describe(r: ApiRow): { name: string; shortLabel: string } {
  const lane = `${r.originCity ?? ""}${r.originState ? `, ${r.originState}` : ""} → ${r.destinationCity ?? ""}${
    r.destinationState ? `, ${r.destinationState}` : ""
  }`;
  const bits: string[] = [];
  if (r.equipmentType) bits.push(r.equipmentType);
  if (r.lumberSpec?.species) bits.push(r.lumberSpec.species);
  if (r.lumberSpec?.nominalSize) bits.push(r.lumberSpec.nominalSize);
  return { name: lane.trim() || "Recent post", shortLabel: bits.join(" · ") };
}

function relative(iso: string): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  const diffMs = Date.now() - t;
  const min = Math.round(diffMs / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.round(hr / 24);
  return `${d}d ago`;
}

export function RecentPostsPicker({ onLoad }: Props) {
  const [list, setList] = useState<ApiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const r = await fetch("/api/loads/recent?limit=5");
        if (!r.ok) return;
        const j = await r.json();
        if (!cancelled) setList(Array.isArray(j.data) ? j.data : []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!loading && list.length === 0) {
    return null;
  }

  return (
    <section className="rounded border border-emerald-200 bg-emerald-50/40 p-3">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <h4 className="text-xs font-bold uppercase tracking-wide text-emerald-900">
          Recent posts {!loading && `· last ${list.length}`}
        </h4>
        <span className="text-[11px] text-emerald-800">{open ? "Hide" : "Show"}</span>
      </button>
      <p className="mt-1 text-[11px] text-zinc-600">
        Re-post one of your last loads in one click — same lane, equipment, weight, rate, lumber spec. Edit anything you
        like before submitting.
      </p>

      {open && (
        <div className="mt-2 grid gap-2">
          {loading && <p className="text-[11px] text-zinc-500">Loading recent posts…</p>}
          {list.map((row) => {
            const desc = describe(row);
            return (
              <div
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-emerald-200 bg-white px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-zinc-900">{desc.name}</p>
                  <p className="truncate text-[11px] text-zinc-500">
                    {desc.shortLabel || "—"}
                    {row.weightLbs ? ` · ${row.weightLbs.toLocaleString()} lbs` : ""}
                    {row.defaultRateUsd ? ` · $${row.defaultRateUsd.toLocaleString()}` : ""}
                    {` · ${relative(row.createdAt)}`}
                    {row.referenceNumber ? ` · ${row.referenceNumber}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const desc2 = describe(row);
                    onLoad({
                      id: row.id,
                      name: desc2.name,
                      shortLabel: desc2.shortLabel,
                      originCity: row.originCity,
                      originState: row.originState,
                      originZip: row.originZip,
                      destinationCity: row.destinationCity,
                      destinationState: row.destinationState,
                      destinationZip: row.destinationZip,
                      equipmentType: row.equipmentType,
                      weightLbs: row.weightLbs,
                      isRush: row.isRush,
                      isPrivate: row.isPrivate,
                      defaultRateUsd: row.defaultRateUsd,
                      defaultCurrency: row.defaultCurrency,
                      notes: row.notes,
                      lumberSpec: row.lumberSpec,
                    });
                  }}
                  className="rounded bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800"
                >
                  ↻ Repost
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
