"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { LobBrandStrip } from "@/components/lob-brand-strip";
import { LobSidebar } from "@/components/lob-sidebar";

type Carrier = { id: string; legalName: string; dotNumber: string | null };

export default function ShipperCarrierPreferencesPage() {
  const [me, setMe] = useState<{ role?: string } | null>(null);
  const [picklist, setPicklist] = useState<Carrier[]>([]);
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    const [rMe, rPick, rBlock] = await Promise.all([
      fetch("/api/me"),
      fetch("/api/shipper/carrier-picklist"),
      fetch("/api/shipper/blocked-carriers"),
    ]);
    const jMe = await rMe.json();
    setMe({ role: jMe.role });
    if (!rPick.ok || !rBlock.ok) {
      setErr("Could not load carrier list. Supplier account required.");
      setLoading(false);
      return;
    }
    const jPick = await rPick.json();
    const jBlock = await rBlock.json();
    setPicklist(jPick.data ?? []);
    setBlockedIds(new Set((jBlock.data?.blocked ?? []).map((c: Carrier) => c.id)));
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function toggleBlock(id: string) {
    setBlockedIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    setErr(null);
    const r = await fetch("/api/shipper/blocked-carriers", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blockedCarrierCompanyIds: [...blockedIds] }),
    });
    const j = await r.json().catch(() => ({}));
    setSaving(false);
    if (!r.ok) {
      setErr(typeof j.error === "string" ? j.error : "Save failed.");
      return;
    }
    setMsg("Saved. Blocked carriers no longer appear on your Capacity view and cannot see your posted loads.");
  }

  if (me && me.role !== "SHIPPER") {
    return (
      <main className="min-h-[calc(100vh-3.5rem)] bg-lob-paper p-6">
        <div className="mx-auto max-w-lg rounded-lg border border-stone-200 bg-white p-6 text-center">
          <p className="text-sm text-stone-600">This page is for supplier (shipper) accounts.</p>
          <Link href="/" className="mt-4 inline-block text-sm font-medium text-lob-navy underline">
            Back to loads
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-lob-paper text-stone-900">
      <div className="mx-auto flex max-w-[1600px] gap-0 rounded-lg border border-zinc-200 bg-white shadow-sm">
        <LobSidebar active="carrierPrefs" />
        <div className="min-w-0 flex-1">
          <LobBrandStrip />
          <div className="p-6 lg:p-8">
            <h1 className="text-2xl font-bold text-zinc-900">Carrier preferences</h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-600">
              Block carriers you do not want to use. They will be hidden from your{" "}
              <Link className="font-medium text-lob-navy underline" href="/capacity">
                Capacity
              </Link>{" "}
              search and will not see any loads you post. When posting a load you can also use tiers (invite-only) or
              exclude specific carriers for that load only.
            </p>

            {loading ? (
              <p className="mt-8 text-sm text-zinc-500">Loading…</p>
            ) : (
              <form onSubmit={save} className="mt-8 max-w-2xl space-y-4">
                {err && <p className="text-sm text-red-700">{err}</p>}
                {msg && <p className="text-sm text-emerald-800">{msg}</p>}
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Approved carriers</p>
                <div className="max-h-[min(28rem,55vh)] space-y-2 overflow-y-auto rounded-lg border border-zinc-200 bg-zinc-50/80 p-3">
                  {picklist.length === 0 ? (
                    <p className="text-sm text-zinc-500">No approved carriers in the directory yet.</p>
                  ) : (
                    picklist.map((c) => (
                      <label
                        key={c.id}
                        className="flex cursor-pointer items-start gap-3 rounded-md border border-transparent px-2 py-2 hover:bg-white"
                      >
                        <input
                          type="checkbox"
                          checked={blockedIds.has(c.id)}
                          onChange={() => toggleBlock(c.id)}
                          className="mt-1"
                        />
                        <span className="text-sm">
                          <span className="font-medium text-zinc-900">{c.legalName}</span>
                          {c.dotNumber && <span className="ml-2 text-xs text-zinc-500">DOT {c.dotNumber}</span>}
                        </span>
                      </label>
                    ))
                  )}
                </div>
                <p className="text-xs text-zinc-500">
                  Checked = blocked for your company. Uncheck to allow them again on capacity and loads.
                </p>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-lob-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-lob-navy-hover disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save preferences"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
