"use client";

import { useCallback, useEffect, useState } from "react";

import { CarrierTypeTag } from "@/components/carrier-type-tag";
import { PlaceAutocomplete } from "@/components/place-autocomplete";
import { LUMBER_EQUIPMENT } from "@/lib/lumber-equipment";

type Me = { role?: string; companyId?: string | null };

type LaneRow = {
  id: string;
  originZip: string;
  originCity: string | null;
  originState: string | null;
  destinationZip: string;
  destinationCity: string | null;
  destinationState: string | null;
  equipmentType: string;
  askingRateUsd: number;
  notes: string | null;
  availableFrom: string;
  availableUntil: string;
};

/** Shipper-facing row — adds anonymized carrier-type signals; identity is hidden. */
type OpenRow = LaneRow & {
  createdAt: string;
  carrierType: "ASSET_BASED" | "BROKER" | null;
  isOwnerOperator: boolean;
  carrierVerified: boolean;
};

/** Carrier's own posts — they already know who they are. */
type MineRow = LaneRow & { isExpired: boolean };

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

function defaultUntilFrom(fromStr: string) {
  const from = new Date(`${fromStr}T12:00:00.000Z`);
  const until = new Date(from);
  until.setUTCDate(until.getUTCDate() + 4);
  return ymd(until);
}

export function CapacityWorkspace() {
  const [me, setMe] = useState<Me | null>(null);
  const [shipperRows, setShipperRows] = useState<OpenRow[]>([]);
  const [mine, setMine] = useState<MineRow[]>([]);
  const [originZip, setOriginZip] = useState("");
  const [destinationZip, setDestinationZip] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const [post, setPost] = useState({
    originZip: "",
    destinationZip: "",
    equipmentType: "SB",
    askingRateUsd: "",
    notes: "",
    availableFrom: ymd(new Date()),
    availableUntil: defaultUntilFrom(ymd(new Date())),
  });

  const loadMe = useCallback(async () => {
    const r = await fetch("/api/me");
    const j = await r.json();
    setMe({ role: j.role, companyId: j.companyId ?? null });
  }, []);

  const loadShipper = useCallback(async () => {
    const params = new URLSearchParams();
    if (originZip.replace(/\D/g, "").length >= 3) params.set("originZip", originZip);
    if (destinationZip.replace(/\D/g, "").length >= 3) params.set("destinationZip", destinationZip);
    const r = await fetch(`/api/capacity?${params}`);
    if (!r.ok) {
      setShipperRows([]);
      return;
    }
    const j = await r.json();
    setShipperRows(j.data ?? []);
  }, [originZip, destinationZip]);

  const loadMine = useCallback(async () => {
    const r = await fetch("/api/capacity/mine");
    if (!r.ok) {
      setMine([]);
      return;
    }
    const j = await r.json();
    setMine(j.data ?? []);
  }, []);

  useEffect(() => {
    void loadMe();
  }, [loadMe]);

  useEffect(() => {
    if (me?.role === "SHIPPER" || me?.role === "ADMIN") void loadShipper();
  }, [me, loadShipper]);

  useEffect(() => {
    if (me?.role === "DISPATCHER" || me?.role === "ADMIN") void loadMine();
  }, [me, loadMine]);

  const isShipperLike = me?.role === "SHIPPER" || me?.role === "ADMIN";
  const isCarrier = me?.role === "DISPATCHER";

  const fmtRange = (a: string, b: string) => {
    const da = new Date(a);
    const db = new Date(b);
    return `${da.toLocaleDateString()} – ${db.toLocaleDateString()}`;
  };

  async function submitCapacity(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const rate = Number(post.askingRateUsd);
    if (!Number.isFinite(rate) || rate <= 0) {
      setMsg("Enter a valid asking rate.");
      return;
    }
    const r = await fetch("/api/capacity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        originZip: post.originZip,
        destinationZip: post.destinationZip,
        equipmentType: post.equipmentType,
        askingRateUsd: rate,
        notes: post.notes || undefined,
        availableFrom: post.availableFrom,
        availableUntil: post.availableUntil,
      }),
    });
    const j = await r.json();
    if (!r.ok) {
      setMsg(typeof j.error === "string" ? j.error : "Could not post capacity.");
      return;
    }
    setMsg("Capacity posted.");
    setPost((p) => ({ ...p, notes: "" }));
    void loadMine();
  }

  async function repost(row: MineRow) {
    const from = ymd(new Date());
    const until = defaultUntilFrom(from);
    const r = await fetch(`/api/capacity/${row.id}/repost`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ availableFrom: from, availableUntil: until }),
    });
    const j = await r.json();
    if (!r.ok) {
      setMsg(typeof j.error === "string" ? j.error : "Repost failed.");
      return;
    }
    setMsg("Reposted with a fresh 5-day window.");
    void loadMine();
    if (isShipperLike) void loadShipper();
  }

  const whenFromChanges = useCallback((v: string) => {
    setPost((p) => ({
      ...p,
      availableFrom: v,
      availableUntil: defaultUntilFrom(v),
    }));
  }, []);

  if (!me) {
    return <p className="text-sm text-zinc-600">Loading…</p>;
  }

  return (
    <div className="space-y-10">
      <section className="rounded-lg border border-lob-gold/40 bg-lob-paper p-4 text-sm text-lob-navy">
        <h2 className="font-semibold">How capacity works</h2>
        <ul className="mt-2 list-inside list-disc space-y-1 text-zinc-800">
          <li>
            <strong>Loads</strong> (sidebar) lists freight posted by mills and wholesalers.
          </li>
          <li>
            <strong>Capacity</strong> lists trucks carriers are willing to run (carrier names stay hidden on the open
            board).
          </li>
          <li>
            Each post is valid for up to <strong>five calendar days</strong> (inclusive). After the last day, carriers
            see a <strong>Repost</strong> action to publish a new window.
          </li>
        </ul>
      </section>

      {msg && (
        <p className="rounded border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-800" role="status">
          {msg}
        </p>
      )}

      {isShipperLike && (
        <section>
          <h2 className="text-lg font-semibold text-zinc-900">Search carrier capacity</h2>
          <p className="mt-1 text-sm text-zinc-600">Filter by ZIP (optional). Only active (unexpired) windows appear.</p>
          <div className="mt-3 grid max-w-2xl gap-2 sm:grid-cols-2">
            <PlaceAutocomplete
              mode="geocode"
              label="Search origin (fills ZIP from Places)"
              placeholder="City or postal code…"
              onResolved={(p) => p.zip && setOriginZip(p.zip.toUpperCase())}
            />
            <PlaceAutocomplete
              mode="geocode"
              label="Search destination (fills ZIP from Places)"
              placeholder="City or postal code…"
              onResolved={(p) => p.zip && setDestinationZip(p.zip.toUpperCase())}
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-3">
            <input
              className="rounded border px-3 py-2 text-sm"
              placeholder="Origin ZIP"
              value={originZip}
              onChange={(e) => setOriginZip(e.target.value)}
            />
            <input
              className="rounded border px-3 py-2 text-sm"
              placeholder="Destination ZIP"
              value={destinationZip}
              onChange={(e) => setDestinationZip(e.target.value)}
            />
            <button
              type="button"
              className="rounded-md bg-lob-navy px-4 py-2 text-sm font-medium text-white"
              onClick={() => void loadShipper()}
            >
              Refresh
            </button>
          </div>
          <div className="mt-4 overflow-x-auto rounded border border-zinc-200 bg-white">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b bg-zinc-50 text-xs font-semibold uppercase text-zinc-600">
                <tr>
                  <th className="px-3 py-2">Lane</th>
                  <th className="px-3 py-2">Carrier type</th>
                  <th className="px-3 py-2">Equipment</th>
                  <th className="px-3 py-2 text-right">Asking</th>
                  <th className="px-3 py-2">Available</th>
                  <th className="px-3 py-2">Notes</th>
                </tr>
              </thead>
              <tbody>
                {shipperRows.map((r) => (
                  <tr key={r.id} className="border-b border-zinc-100">
                    <td className="px-3 py-2">
                      {[r.originCity, r.originState].filter(Boolean).join(", ") || r.originZip} →{" "}
                      {[r.destinationCity, r.destinationState].filter(Boolean).join(", ") || r.destinationZip}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap items-center gap-1">
                        {r.carrierType || r.isOwnerOperator ? (
                          <CarrierTypeTag
                            carrierType={r.carrierType}
                            isOwnerOperator={r.isOwnerOperator}
                            compact
                          />
                        ) : (
                          <span className="text-[11px] text-zinc-400 italic">Unverified</span>
                        )}
                        {r.carrierVerified && (
                          <span
                            className="inline-flex items-center rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-900 ring-1 ring-emerald-300"
                            title="Carrier identity & docs verified by LOB"
                          >
                            ✓ Verified
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2">{r.equipmentType}</td>
                    <td className="px-3 py-2 text-right font-medium tabular-nums">
                      ${r.askingRateUsd.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-xs text-zinc-600">{fmtRange(r.availableFrom, r.availableUntil)}</td>
                    <td className="max-w-[200px] truncate px-3 py-2 text-xs text-zinc-500">{r.notes ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {shipperRows.length === 0 && (
              <p className="p-6 text-center text-sm text-zinc-500">No matching capacity in active windows.</p>
            )}
          </div>
        </section>
      )}

      {isCarrier && (
        <section>
          <h2 className="text-lg font-semibold text-zinc-900">Post capacity</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Pick a date range of at most five days. Shippers only see rows until the end of the last day (UTC).
          </p>
          <form onSubmit={submitCapacity} className="mt-4 grid max-w-xl gap-3 rounded-lg border border-zinc-200 bg-white p-4">
            <div className="space-y-2">
              <div className="grid gap-3 sm:grid-cols-2">
                <PlaceAutocomplete
                  mode="geocode"
                  label="Search origin (fills origin ZIP)"
                  placeholder="City or postal code…"
                  onResolved={(p) => {
                    if (p.zip) setPost((o) => ({ ...o, originZip: p.zip.toUpperCase() }));
                  }}
                />
                <PlaceAutocomplete
                  mode="geocode"
                  label="Search destination (fills dest ZIP)"
                  placeholder="City or postal code…"
                  onResolved={(p) => {
                    if (p.zip) {
                      setPost((o) => ({ ...o, destinationZip: p.zip.toUpperCase() }));
                    }
                  }}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  required
                  className="rounded border px-3 py-2 text-sm"
                  placeholder="Origin ZIP *"
                  value={post.originZip}
                  onChange={(e) => setPost((p) => ({ ...p, originZip: e.target.value }))}
                />
                <input
                  required
                  className="rounded border px-3 py-2 text-sm"
                  placeholder="Destination ZIP *"
                  value={post.destinationZip}
                  onChange={(e) => setPost((p) => ({ ...p, destinationZip: e.target.value }))}
                />
              </div>
            </div>
            <select
              className="rounded border px-3 py-2 text-sm"
              value={post.equipmentType}
              onChange={(e) => setPost((p) => ({ ...p, equipmentType: e.target.value }))}
            >
              {LUMBER_EQUIPMENT.map((eq) => (
                <option key={eq.code} value={eq.code}>
                  {eq.label} ({eq.code})
                </option>
              ))}
            </select>
            <input
              required
              className="rounded border px-3 py-2 text-sm"
              placeholder="Asking rate (USD) *"
              inputMode="decimal"
              value={post.askingRateUsd}
              onChange={(e) => setPost((p) => ({ ...p, askingRateUsd: e.target.value }))}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-zinc-500">First day</label>
                <input
                  type="date"
                  required
                  className="mt-1 w-full rounded border px-3 py-2 text-sm"
                  value={post.availableFrom}
                  onChange={(e) => whenFromChanges(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-500">Last day (≤ 5-day span)</label>
                <input
                  type="date"
                  required
                  className="mt-1 w-full rounded border px-3 py-2 text-sm"
                  value={post.availableUntil}
                  onChange={(e) => setPost((p) => ({ ...p, availableUntil: e.target.value }))}
                />
              </div>
            </div>
            <textarea
              className="rounded border px-3 py-2 text-sm"
              placeholder="Notes (optional)"
              rows={2}
              value={post.notes}
              onChange={(e) => setPost((p) => ({ ...p, notes: e.target.value }))}
            />
            <button type="submit" className="rounded-md bg-lob-navy px-4 py-2 text-sm font-semibold text-white">
              Publish capacity
            </button>
          </form>
        </section>
      )}

      {isCarrier && (
        <section>
          <h2 className="text-lg font-semibold text-zinc-900">Your posts</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Expired windows stay listed until you repost—customers no longer see them on the public capacity search.
          </p>
          <ul className="mt-4 space-y-3">
            {mine.map((r) => (
              <li key={r.id} className="rounded-lg border border-zinc-200 bg-white p-4 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-zinc-900">
                      {r.originZip} → {r.destinationZip} · {r.equipmentType} · ${r.askingRateUsd.toLocaleString()}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">{fmtRange(r.availableFrom, r.availableUntil)}</p>
                    {r.isExpired && (
                      <p className="mt-2 text-xs font-semibold text-amber-800">This window has ended — repost to go live again.</p>
                    )}
                  </div>
                  {r.isExpired && (
                    <button
                      type="button"
                      className="shrink-0 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white"
                      onClick={() => void repost(r)}
                    >
                      Repost (next 5 days)
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
          {mine.length === 0 && <p className="mt-4 text-sm text-zinc-500">You have no open capacity posts.</p>}
        </section>
      )}

      {!isShipperLike && !isCarrier && (
        <p className="text-sm text-zinc-600">
          Sign in as a supplier to search capacity, or as a carrier dispatcher to post trucks.
        </p>
      )}
    </div>
  );
}
