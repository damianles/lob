"use client";

import { useEffect, useMemo, useState } from "react";

import type { LumberSpec } from "@/lib/lumber-spec";

/**
 * Reusable post-load template picker + "Save as template" button. Renders at
 * the top of the supplier post-load form. The shipper picks an existing
 * template to populate the form, or saves the current state as a new template
 * for next time.
 */

export type LoadTemplate = {
  id: string;
  name: string;
  shortLabel: string | null;
  originCity: string | null;
  originState: string | null;
  originZip: string | null;
  destinationCity: string | null;
  destinationState: string | null;
  destinationZip: string | null;
  equipmentType: string | null;
  weightLbs: number | null;
  isRush: boolean;
  isPrivate: boolean;
  defaultRateUsd: number | null;
  defaultCurrency: "USD" | "CAD";
  notes: string | null;
  lumberSpec: LumberSpec | null;
};

export type CurrentFormSnapshot = {
  originCity: string;
  originState: string;
  originZip: string;
  destinationCity: string;
  destinationState: string;
  destinationZip: string;
  equipmentType: string;
  weightLbs: string;
  isRush: boolean;
  isPrivate: boolean;
  rateUsd: string;
  currency: "USD" | "CAD";
  notes: string;
  lumber: LumberSpec;
};

type Props = {
  /** Apply a template's fields to the parent form. */
  onLoad: (t: LoadTemplate) => void;
  /** Snapshot getter so we don't capture stale state. */
  getCurrentSnapshot: () => CurrentFormSnapshot;
  /**
   * full = picker + save (legacy inline form)
   * picker = choose/apply/delete only
   * save-only = name + save current (use next to Publish)
   */
  variant?: "full" | "picker" | "save-only";
};

export function LoadTemplatesPanel({
  onLoad,
  getCurrentSnapshot,
  variant = "full",
}: Props) {
  const [list, setList] = useState<LoadTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [picked, setPicked] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [showSave, setShowSave] = useState(variant === "save-only");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const r = await fetch("/api/templates");
        if (!r.ok) return;
        const j = await r.json();
        if (!cancelled) setList(j.data ?? []);
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
      const r = await fetch("/api/templates");
      if (r.ok) {
        const j = await r.json();
        setList(j.data ?? []);
      }
    })();
  }

  function applyPicked() {
    const t = list.find((x) => x.id === picked);
    if (!t) return;
    onLoad(t);
    setMsg(`Loaded "${t.name}". Set pickup and delivery dates, then review details.`);
  }

  async function onSaveTemplate() {
    if (!name.trim()) return;
    const snap = getCurrentSnapshot();
    const body: Record<string, unknown> = {
      name: name.trim(),
      originCity: snap.originCity || undefined,
      originState: snap.originState || undefined,
      originZip: snap.originZip || undefined,
      destinationCity: snap.destinationCity || undefined,
      destinationState: snap.destinationState || undefined,
      destinationZip: snap.destinationZip || undefined,
      equipmentType: snap.equipmentType || undefined,
      weightLbs: snap.weightLbs && Number.isFinite(Number(snap.weightLbs))
        ? Number(snap.weightLbs)
        : undefined,
      isRush: snap.isRush,
      isPrivate: snap.isPrivate,
      defaultRateUsd: snap.rateUsd && Number.isFinite(Number(snap.rateUsd))
        ? Number(snap.rateUsd)
        : undefined,
      defaultCurrency: snap.currency,
      notes: snap.notes || undefined,
      lumberSpec: hasAnyLumberSpec(snap.lumber) ? snap.lumber : undefined,
    };
    setSaving(true);
    setMsg(null);
    try {
      const r = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok) {
        setMsg(typeof j.error === "string" ? j.error : "Save failed.");
        return;
      }
      setName("");
      setShowSave(false);
      setMsg(`Saved lane with products "${j.data.name}".`);
      refresh();
    } finally {
      setSaving(false);
    }
  }

  async function onDeletePicked() {
    if (!picked) return;
    const t = list.find((x) => x.id === picked);
    if (!t) return;
    if (!confirm(`Delete saved lane "${t.name}"?`)) return;
    const r = await fetch(`/api/templates/${picked}`, { method: "DELETE" });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      setMsg(j.error ?? "Delete failed.");
      return;
    }
    setPicked("");
    setMsg(`Deleted "${t.name}".`);
    refresh();
  }

  const summary = useMemo(() => {
    const t = list.find((x) => x.id === picked);
    if (!t) return "";
    const parts: string[] = [];
    if (t.originCity || t.originState) parts.push(`from ${t.originCity ?? ""} ${t.originState ?? ""}`.trim());
    if (t.destinationCity || t.destinationState) parts.push(`to ${t.destinationCity ?? ""} ${t.destinationState ?? ""}`.trim());
    if (t.equipmentType) parts.push(t.equipmentType);
    if (t.weightLbs) parts.push(`${t.weightLbs.toLocaleString()} lbs`);
    if (t.lumberSpec?.species) parts.push(t.lumberSpec.species);
    if (t.lumberSpec?.nominalSize) parts.push(t.lumberSpec.nominalSize);
    return parts.join(" · ");
  }, [list, picked]);

  if (variant === "save-only") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {msg && <p className="w-full text-[11px] text-emerald-800">{msg}</p>}
        {!showSave ? (
          <button
            type="button"
            onClick={() => setShowSave(true)}
            className="rounded-lg border border-emerald-600 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
          >
            Save as Saved Lane (with products)
          </button>
        ) : (
          <>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name this saved lane"
              className="min-w-[12rem] flex-1 rounded border border-emerald-300 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={onSaveTemplate}
              disabled={!name.trim() || saving}
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowSave(false);
                setName("");
                setMsg(null);
              }}
              className="rounded-lg border border-stone-300 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
            >
              Cancel
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <section className="rounded border border-emerald-200 bg-white/90 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-xs font-bold uppercase tracking-wide text-emerald-900">
          Saved lanes (with products)
        </h4>
        <p className="text-[11px] text-zinc-500">
          Lane + product setup — dates are always entered fresh when you post.
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
            {loading
              ? "Loading…"
              : list.length
                ? "Pick a saved lane with products…"
                : "None saved yet"}
          </option>
          {list.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
              {t.shortLabel ? ` — ${t.shortLabel}` : ""}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={applyPicked}
          disabled={!picked}
          className="rounded bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Use this
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
      {summary && <p className="mt-1 text-[11px] text-zinc-500">{summary}</p>}

      {variant === "full" && (
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {!showSave ? (
          <button
            type="button"
            onClick={() => setShowSave(true)}
            className="rounded-md border border-emerald-600 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
          >
            + Save current as lane with products
          </button>
        ) : (
          <>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. PG → Boise · Tri-axle · 2x4-8"
              className="flex-1 rounded border border-emerald-300 px-2 py-1.5 text-sm"
            />
            <button
              type="button"
              onClick={onSaveTemplate}
              disabled={!name.trim() || saving}
              className="rounded bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
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
      )}
    </section>
  );
}

function hasAnyLumberSpec(spec: LumberSpec): boolean {
  return Object.values(spec).some((v) => {
    if (v === undefined || v === null || v === "") return false;
    if (Array.isArray(v)) return v.length > 0;
    return true;
  });
}
