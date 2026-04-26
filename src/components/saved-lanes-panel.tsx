"use client";

import { useEffect, useMemo, useState } from "react";

/**
 * Address-only saved lanes for shippers — lighter than LoadTemplate.
 *
 * The panel sits above the lane fields on the supplier post-load form.
 * Picking a lane fills ONLY origin + destination addresses; everything
 * else (product, rate, dates) stays untouched so the user only edits
 * what's actually different per shipment.
 *
 * Saving from the form captures the lane fields the user just typed,
 * with an optional friendly label. Re-saving an identical route updates
 * the existing row instead of creating duplicates (server-side dedup).
 */

export type SavedLane = {
  id: string;
  label: string | null;
  originCity: string;
  originState: string;
  originZip: string;
  originAddress: string | null;
  originPhone: string | null;
  destinationCity: string;
  destinationState: string;
  destinationZip: string;
  destinationAddress: string | null;
  destinationPhone: string | null;
  useCount: number;
  lastUsedAt: string | null;
  createdAt: string;
};

export type LaneOnlySnapshot = {
  originCity: string;
  originState: string;
  originZip: string;
  originAddress?: string;
  originPhone?: string;
  destinationCity: string;
  destinationState: string;
  destinationZip: string;
  destinationAddress?: string;
  destinationPhone?: string;
};

type Props = {
  /** Apply a lane's addresses to the parent form (lane-only — does NOT touch products/rate/dates). */
  onPick: (l: SavedLane) => void;
  /** Snapshot getter — lets the panel save what's currently typed. */
  getCurrentLane: () => LaneOnlySnapshot;
};

function laneSummary(l: SavedLane): string {
  return `${l.originCity}, ${l.originState} → ${l.destinationCity}, ${l.destinationState}`;
}

function laneIsComplete(s: LaneOnlySnapshot): boolean {
  return Boolean(
    s.originCity && s.originState && s.originZip && s.destinationCity && s.destinationState && s.destinationZip,
  );
}

export function SavedLanesPanel({ onPick, getCurrentLane }: Props) {
  const [list, setList] = useState<SavedLane[]>([]);
  const [loading, setLoading] = useState(true);
  const [picked, setPicked] = useState<string>("");
  const [showSave, setShowSave] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const r = await fetch("/api/lanes");
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

  function refresh() {
    void (async () => {
      const r = await fetch("/api/lanes");
      if (r.ok) {
        const j = await r.json();
        setList(j.data ?? []);
      }
    })();
  }

  function applyPicked() {
    const lane = list.find((x) => x.id === picked);
    if (!lane) return;
    onPick(lane);
    setMsg(`Loaded "${lane.label ?? laneSummary(lane)}".`);
    // Fire-and-forget usage bump so the picker re-orders next time.
    void fetch(`/api/lanes/${lane.id}/used`, { method: "POST" }).catch(() => {});
  }

  async function onSaveCurrent() {
    const snap = getCurrentLane();
    if (!laneIsComplete(snap)) {
      setMsg("Fill origin + destination city, state, and zip before saving.");
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      const r = await fetch("/api/lanes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: name.trim() || undefined,
          originCity: snap.originCity,
          originState: snap.originState,
          originZip: snap.originZip,
          originAddress: snap.originAddress?.trim() || undefined,
          originPhone: snap.originPhone?.trim() || undefined,
          destinationCity: snap.destinationCity,
          destinationState: snap.destinationState,
          destinationZip: snap.destinationZip,
          destinationAddress: snap.destinationAddress?.trim() || undefined,
          destinationPhone: snap.destinationPhone?.trim() || undefined,
        }),
      });
      const j = await r.json();
      if (!r.ok) {
        setMsg(typeof j.error === "string" ? j.error : "Save failed.");
        return;
      }
      setName("");
      setShowSave(false);
      setMsg(j.deduped ? "Updated existing saved lane." : "Saved lane.");
      refresh();
    } finally {
      setSaving(false);
    }
  }

  async function onDeletePicked() {
    if (!picked) return;
    const lane = list.find((x) => x.id === picked);
    if (!lane) return;
    if (!confirm(`Delete saved lane "${lane.label ?? laneSummary(lane)}"?`)) return;
    const r = await fetch(`/api/lanes/${lane.id}`, { method: "DELETE" });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      setMsg(j.error ?? "Delete failed.");
      return;
    }
    setPicked("");
    setMsg(`Deleted "${lane.label ?? laneSummary(lane)}".`);
    refresh();
  }

  const pickedDetails = useMemo(() => {
    const l = list.find((x) => x.id === picked);
    if (!l) return null;
    const bits: string[] = [];
    if (l.originAddress) bits.push(`PU: ${l.originAddress}`);
    if (l.destinationAddress) bits.push(`DEL: ${l.destinationAddress}`);
    if (l.useCount > 0) bits.push(`${l.useCount}× used`);
    return bits.join(" · ");
  }, [list, picked]);

  return (
    <section className="rounded border border-emerald-200 bg-white/90 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-xs font-bold uppercase tracking-wide text-emerald-900">Saved lanes</h4>
        <p className="text-[11px] text-zinc-500">
          Pick a lane → only fills the addresses. You enter products, dates, and price fresh each time.
        </p>
      </div>
      {msg && <p className="mt-2 text-[11px] text-emerald-800">{msg}</p>}

      <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
        <select
          value={picked}
          onChange={(e) => setPicked(e.target.value)}
          className="rounded border border-emerald-300 px-2 py-2 text-sm"
          disabled={loading}
        >
          <option value="">
            {loading ? "Loading lanes…" : list.length ? "Pick a saved lane…" : "No saved lanes yet"}
          </option>
          {list.map((l) => (
            <option key={l.id} value={l.id}>
              {l.label ? `${l.label} — ${laneSummary(l)}` : laneSummary(l)}
              {l.useCount > 0 ? ` (${l.useCount}×)` : ""}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={applyPicked}
          disabled={!picked}
          className="rounded bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Use lane
        </button>
        <button
          type="button"
          onClick={onDeletePicked}
          disabled={!picked}
          className="rounded border border-stone-300 px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Delete
        </button>
      </div>
      {pickedDetails && <p className="mt-1 text-[11px] text-zinc-500">{pickedDetails}</p>}

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {!showSave ? (
          <button
            type="button"
            onClick={() => setShowSave(true)}
            className="rounded-md border border-emerald-600 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
          >
            + Save current lane
          </button>
        ) : (
          <>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Optional label (e.g. PG → Boise)"
              className="flex-1 rounded border border-emerald-300 px-2 py-1.5 text-sm"
            />
            <button
              type="button"
              onClick={onSaveCurrent}
              disabled={saving}
              className="rounded bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save lane"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowSave(false);
                setName("");
              }}
              className="rounded border border-stone-300 px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-50"
            >
              Cancel
            </button>
          </>
        )}
      </div>
    </section>
  );
}
