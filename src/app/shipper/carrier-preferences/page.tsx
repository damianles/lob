"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { LobBrandStrip } from "@/components/lob-brand-strip";
import { LobSidebar } from "@/components/lob-sidebar";
import { DistanceUnitProfilePreference } from "@/components/distance-unit-profile-preference";
import { DisplayCurrencyPreference } from "@/components/display-currency-preference";

type Carrier = { id: string; legalName: string; dotNumber: string | null };

export default function ShipperCarrierPreferencesPage() {
  const [me, setMe] = useState<{ role?: string } | null>(null);
  const [picklist, setPicklist] = useState<Carrier[]>([]);
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const [tierByCarrier, setTierByCarrier] = useState<Map<string, 1 | 2 | 3>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    const [rMe, rPick, rBlock, rTiers] = await Promise.all([
      fetch("/api/me"),
      fetch("/api/shipper/carrier-picklist"),
      fetch("/api/shipper/blocked-carriers"),
      fetch("/api/shipper/carrier-tiers"),
    ]);
    const jMe = (await rMe.json()) as {
      role?: string;
      companyId?: string | null;
      simulated?: boolean;
    };
    const jPick = await rPick.json().catch(() => ({}));
    const jBlock = await rBlock.json().catch(() => ({}));
    const jTiers = await rTiers.json().catch(() => ({}));
    setMe({ role: jMe.role });

    if (!rPick.ok || !rBlock.ok) {
      if (jMe.role !== "SHIPPER" || !jMe.companyId) {
        setErr(
          jMe.simulated
            ? "Supplier preview needs seed data. Run npm run db:seed, then reset view-as or use Admin → Test lab → Test as supplier (North Ridge)."
            : "Link a supplier company in Account setup before managing carrier preferences.",
        );
      } else {
        const apiErr =
          (typeof jPick.error === "string" && jPick.error) ||
          (typeof jBlock.error === "string" && jBlock.error) ||
          null;
        setErr(apiErr ?? "Could not load carrier list.");
      }
      setLoading(false);
      return;
    }

    setPicklist(jPick.data ?? []);
    setBlockedIds(new Set((jBlock.data?.blocked ?? []).map((c: Carrier) => c.id)));
    const nextTiers = new Map<string, 1 | 2 | 3>();
    for (const a of jTiers.data?.assignments ?? []) {
      const t = Number(a.tier);
      if (t === 1 || t === 2 || t === 3) nextTiers.set(a.carrierCompanyId, t);
    }
    setTierByCarrier(nextTiers);
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
    setTierByCarrier((prev) => {
      if (!prev.has(id)) return prev;
      const n = new Map(prev);
      n.delete(id);
      return n;
    });
  }

  function setTier(id: string, tier: 1 | 2 | 3 | null) {
    setTierByCarrier((prev) => {
      const n = new Map(prev);
      if (tier == null) n.delete(id);
      else n.set(id, tier);
      return n;
    });
    if (tier != null) {
      setBlockedIds((prev) => {
        if (!prev.has(id)) return prev;
        const n = new Set(prev);
        n.delete(id);
        return n;
      });
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    setErr(null);
    const assignments = [...tierByCarrier.entries()]
      .filter(([id]) => !blockedIds.has(id))
      .map(([carrierCompanyId, tier]) => ({ carrierCompanyId, tier }));

    const [rBlock, rTiers] = await Promise.all([
      fetch("/api/shipper/blocked-carriers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockedCarrierCompanyIds: [...blockedIds] }),
      }),
      fetch("/api/shipper/carrier-tiers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignments }),
      }),
    ]);
    const jBlock = await rBlock.json().catch(() => ({}));
    const jTiers = await rTiers.json().catch(() => ({}));
    setSaving(false);
    if (!rBlock.ok) {
      setErr(typeof jBlock.error === "string" ? jBlock.error : "Could not save exclusions.");
      return;
    }
    if (!rTiers.ok) {
      setErr(typeof jTiers.error === "string" ? jTiers.error : "Could not save tiers.");
      return;
    }
    setMsg("Saved. Excluded carriers stay off your loads; tier groups are used when you post with Tiers only.");
  }

  if (me && me.role !== "SHIPPER") {
    return (
      <main className="min-h-[calc(100vh-3.5rem)] bg-lob-paper p-6">
        <div className="mx-auto max-w-lg rounded-lg border border-stone-200 bg-white p-6 text-center">
          <p className="text-sm text-stone-600">This page is for supplier (shipper) accounts.</p>
          <Link href="/shipments" className="mt-4 inline-block text-sm font-medium text-lob-navy underline">
            Back to shipments
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
              Exclude carriers you never want, and assign the rest to T1 / T2 / T3 groups. When posting a load, pick Open
              or which groups can see it — you do not re-assign carriers on every load.
            </p>

            <div className="mt-5 max-w-2xl space-y-4">
              <DistanceUnitProfilePreference persona="supplier" />
              <DisplayCurrencyPreference />
            </div>

            {loading ? (
              <p className="mt-8 text-sm text-zinc-500">Loading…</p>
            ) : (
              <form onSubmit={save} className="mt-8 max-w-3xl space-y-4">
                {err && <p className="text-sm text-red-700">{err}</p>}
                {msg && <p className="text-sm text-emerald-800">{msg}</p>}
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Approved carriers</p>
                <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-zinc-50/80">
                  {picklist.length === 0 ? (
                    <p className="p-3 text-sm text-zinc-500">No approved carriers in the directory yet.</p>
                  ) : (
                    <table className="w-full text-left text-sm">
                      <thead className="bg-zinc-100 text-[10px] font-semibold uppercase text-zinc-600">
                        <tr>
                          <th className="px-3 py-2">Carrier</th>
                          <th className="px-2 py-2 text-center">Exclude</th>
                          <th className="px-2 py-2 text-center">T1</th>
                          <th className="px-2 py-2 text-center">T2</th>
                          <th className="px-2 py-2 text-center">T3</th>
                          <th className="px-2 py-2 text-center">None</th>
                        </tr>
                      </thead>
                      <tbody>
                        {picklist.map((c) => {
                          const blocked = blockedIds.has(c.id);
                          const tier = tierByCarrier.get(c.id);
                          return (
                            <tr key={c.id} className="border-t border-zinc-200/80">
                              <td className="px-3 py-2">
                                <span className="font-medium text-zinc-900">{c.legalName}</span>
                                {c.dotNumber && (
                                  <span className="ml-2 text-xs text-zinc-500">DOT {c.dotNumber}</span>
                                )}
                              </td>
                              <td className="px-2 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={blocked}
                                  onChange={() => toggleBlock(c.id)}
                                  title="Exclude company-wide"
                                />
                              </td>
                              {([1, 2, 3] as const).map((t) => (
                                <td key={t} className="px-2 py-2 text-center">
                                  <input
                                    type="radio"
                                    name={`tier-${c.id}`}
                                    disabled={blocked}
                                    checked={!blocked && tier === t}
                                    onChange={() => setTier(c.id, t)}
                                  />
                                </td>
                              ))}
                              <td className="px-2 py-2 text-center">
                                <input
                                  type="radio"
                                  name={`tier-${c.id}`}
                                  disabled={blocked}
                                  checked={!blocked && tier == null}
                                  onChange={() => setTier(c.id, null)}
                                  title="Not in a tier"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
                <p className="text-xs text-zinc-500">
                  T1 = preferred · T2 = backup · T3 = overflow. Excluded carriers cannot be placed in a tier.
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
