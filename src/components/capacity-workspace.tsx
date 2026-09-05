"use client";

import { useCallback, useEffect, useState } from "react";

import { CarrierTypeTag } from "@/components/carrier-type-tag";
import { RequestCapacityModal } from "@/components/request-capacity-modal";
import { Button } from "@/components/ui/button";
import { formatDisplayDate } from "@/lib/format-display-date";
import { inferOfferCurrency } from "@/lib/lane-currency";
import { formatMoney } from "@/lib/money";
import { PlaceAutocomplete } from "@/components/place-autocomplete";
import { LUMBER_EQUIPMENT } from "@/lib/lumber-equipment";
import Link from "next/link";

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

function capacityRateLabel(r: LaneRow): string {
  const ccy = inferOfferCurrency(r.originState ?? "", r.destinationState ?? "");
  return formatMoney(r.askingRateUsd, ccy);
}

/** Prefer city names — ZIP/postal alone is opaque to customers. */
function capacityPlaceLabel(city: string | null, state: string | null, zip: string): string {
  const place = [city?.trim(), state?.trim()].filter(Boolean).join(", ");
  if (place) return place;
  return zip.trim() || "—";
}

function capacityLaneLabel(r: {
  originCity: string | null;
  originState: string | null;
  originZip: string;
  destinationCity: string | null;
  destinationState: string | null;
  destinationZip: string;
}): string {
  return `${capacityPlaceLabel(r.originCity, r.originState, r.originZip)} → ${capacityPlaceLabel(r.destinationCity, r.destinationState, r.destinationZip)}`;
}

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

function defaultUntilFrom(fromStr: string) {
  const from = new Date(`${fromStr}T12:00:00.000Z`);
  const until = new Date(from);
  until.setUTCDate(until.getUTCDate() + 4);
  return ymd(until);
}

type CarrierInterestRow = {
  id: string;
  status: string;
  note: string | null;
  createdAt: string;
  shipperName: string;
  load: {
    id: string;
    referenceNumber: string;
    originCity: string;
    originState: string;
    destinationCity: string;
    destinationState: string;
    equipmentType: string;
    offeredRateUsd: number | null;
    offerCurrency: "USD" | "CAD";
    requestedPickupAt: string;
  };
  capacity: {
    askingRateUsd: number;
    equipmentType: string;
  };
};

type ShipperInterestRow = {
  id: string;
  status: string;
  createdAt: string;
  carrierRevealed: boolean;
  load: { id: string; referenceNumber: string };
  capacity: {
    equipmentType: string;
    askingRateUsd: number;
    originCity: string | null;
    originState: string | null;
    originZip: string;
    destinationCity: string | null;
    destinationState: string | null;
    destinationZip: string;
  };
};

export function CapacityWorkspace() {
  const [me, setMe] = useState<Me | null>(null);
  const [shipperRows, setShipperRows] = useState<OpenRow[]>([]);
  const [mine, setMine] = useState<MineRow[]>([]);
  const [originZip, setOriginZip] = useState("");
  const [destinationZip, setDestinationZip] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [requestFor, setRequestFor] = useState<OpenRow | null>(null);
  const [carrierInterests, setCarrierInterests] = useState<CarrierInterestRow[]>([]);
  const [shipperInterests, setShipperInterests] = useState<ShipperInterestRow[]>([]);
  const [interestBusy, setInterestBusy] = useState<string | null>(null);

  const [post, setPost] = useState({
    originZip: "",
    originCity: "",
    originState: "",
    destinationZip: "",
    destinationCity: "",
    destinationState: "",
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
    if (originZip.trim().length >= 2) params.set("originZip", originZip);
    if (destinationZip.trim().length >= 2) params.set("destinationZip", destinationZip);
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

  const loadInterests = useCallback(async () => {
    const r = await fetch("/api/capacity/interests");
    if (!r.ok) {
      setCarrierInterests([]);
      setShipperInterests([]);
      return;
    }
    const j = await r.json();
    if (j.perspective === "carrier") {
      setCarrierInterests(j.data ?? []);
      setShipperInterests([]);
    } else {
      setShipperInterests(j.data ?? []);
      setCarrierInterests([]);
    }
  }, []);

  useEffect(() => {
    void loadMe();
  }, [loadMe]);

  useEffect(() => {
    if (me?.role === "SHIPPER" || me?.role === "ADMIN") {
      void loadShipper();
      void loadInterests();
    }
  }, [me, loadShipper, loadInterests]);

  useEffect(() => {
    if (me?.role === "DISPATCHER" || me?.role === "ADMIN") {
      void loadMine();
      void loadInterests();
    }
  }, [me, loadMine, loadInterests]);

  const isShipperLike = me?.role === "SHIPPER" || me?.role === "ADMIN";
  const isCarrier = me?.role === "DISPATCHER";

  const fmtRange = (a: string, b: string) =>
    `${formatDisplayDate(a)} – ${formatDisplayDate(b)}`;

  async function reviewInterest(id: string, decision: "ACCEPT" | "DECLINE") {
    setInterestBusy(id);
    setMsg(null);
    const res = await fetch(`/api/capacity/interests/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision }),
    });
    const j = await res.json().catch(() => ({}));
    setInterestBusy(null);
    if (!res.ok) {
      setMsg(typeof j.error === "string" ? j.error : "Could not update request.");
      return;
    }
    setMsg(
      decision === "ACCEPT"
        ? "Accepted — load booked. Open the shipment for details (identity unlocks there)."
        : "Request declined.",
    );
    void loadInterests();
    void loadMine();
  }

  async function submitCapacity(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!post.originCity.trim() || !post.destinationCity.trim()) {
      setMsg("Enter origin and destination cities (search fills them from Places).");
      return;
    }
    if (!post.originZip.trim() || !post.destinationZip.trim()) {
      setMsg("Enter origin and destination postal / ZIP codes.");
      return;
    }
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
        originCity: post.originCity.trim() || undefined,
        originState: post.originState.trim() || undefined,
        destinationZip: post.destinationZip,
        destinationCity: post.destinationCity.trim() || undefined,
        destinationState: post.destinationState.trim() || undefined,
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
            <strong>Capacity</strong> lists trucks carriers are willing to run. Carrier names stay hidden until they
            accept your request.
          </li>
          <li>
            Carriers you <strong>exclude</strong> in Carrier Preferences never appear here (and never see your loads).
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
          <p className="mt-1 text-sm text-zinc-600">
            Filter by city or postal (optional). Request a truck by attaching one of your posted loads — identity stays
            hidden until they accept.
          </p>
          <div className="mt-3 grid max-w-2xl gap-2 sm:grid-cols-2">
            <PlaceAutocomplete
              mode="geocode"
              label="Search origin"
              placeholder="City or postal code…"
              onResolved={(p) => {
                if (p.city) setOriginZip(p.city);
                else if (p.zip) setOriginZip(p.zip.toUpperCase());
              }}
            />
            <PlaceAutocomplete
              mode="geocode"
              label="Search destination"
              placeholder="City or postal code…"
              onResolved={(p) => {
                if (p.city) setDestinationZip(p.city);
                else if (p.zip) setDestinationZip(p.zip.toUpperCase());
              }}
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-3">
            <input
              className="rounded border px-3 py-2 text-sm"
              placeholder="Origin city or postal"
              value={originZip}
              onChange={(e) => setOriginZip(e.target.value)}
            />
            <input
              className="rounded border px-3 py-2 text-sm"
              placeholder="Destination city or postal"
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
                  <th className="px-3 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {shipperRows.map((r) => (
                  <tr key={r.id} className="border-b border-zinc-100">
                    <td className="px-3 py-2">{capacityLaneLabel(r)}</td>
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
                      {capacityRateLabel(r)}
                    </td>
                    <td className="px-3 py-2 text-xs text-zinc-600">{fmtRange(r.availableFrom, r.availableUntil)}</td>
                    <td className="max-w-[200px] truncate px-3 py-2 text-xs text-zinc-500">{r.notes ?? "—"}</td>
                    <td className="px-3 py-2 text-right">
                      <Button type="button" size="sm" onClick={() => setRequestFor(r)}>
                        Request
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {shipperRows.length === 0 && (
              <p className="p-6 text-center text-sm text-zinc-500">No matching capacity in active windows.</p>
            )}
          </div>

          {shipperInterests.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-zinc-900">Your capacity requests</h3>
              <ul className="mt-2 divide-y divide-stone-100 rounded-lg border border-stone-200 bg-white">
                {shipperInterests.map((row) => (
                  <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                    <div>
                      <p className="font-medium text-zinc-900">
                        {row.load.referenceNumber}{" "}
                        <span className="text-xs font-normal uppercase text-zinc-500">{row.status}</span>
                      </p>
                      <p className="text-xs text-zinc-600">
                        {capacityLaneLabel(row.capacity)} · {row.capacity.equipmentType} ·{" "}
                        {formatMoney(
                          row.capacity.askingRateUsd,
                          inferOfferCurrency(row.capacity.originState ?? "", row.capacity.destinationState ?? ""),
                        )}
                      </p>
                    </div>
                    {row.status === "ACCEPTED" ? (
                      <Link href={`/loads/${row.load.id}`} className="text-xs font-medium text-lob-navy underline">
                        Open shipment
                      </Link>
                    ) : row.status === "PENDING" ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={interestBusy === row.id}
                        onClick={() => {
                          setInterestBusy(row.id);
                          void fetch(`/api/capacity/interests/${row.id}`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ decision: "WITHDRAW" }),
                          }).then(async (res) => {
                            setInterestBusy(null);
                            if (!res.ok) {
                              const j = await res.json().catch(() => ({}));
                              setMsg(typeof j.error === "string" ? j.error : "Could not withdraw.");
                              return;
                            }
                            setMsg("Request withdrawn.");
                            void loadInterests();
                          });
                        }}
                      >
                        Withdraw
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {requestFor && (
        <RequestCapacityModal
          open
          capacityId={requestFor.id}
          capacityLabel={capacityLaneLabel(requestFor)}
          askingLabel={capacityRateLabel(requestFor)}
          onClose={() => setRequestFor(null)}
          onSent={() => {
            setMsg("Request sent. Carrier identity stays hidden until they accept.");
            void loadInterests();
          }}
        />
      )}

      {isCarrier && carrierInterests.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-zinc-900">Capacity requests</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Mills requesting your posted trucks. Accept books their load at their posted rate (or your asking rate if
            none).
          </p>
          <ul className="mt-3 divide-y divide-stone-100 rounded-lg border border-stone-200 bg-white">
            {carrierInterests.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-3">
                <div>
                  <p className="text-sm font-semibold text-zinc-900">
                    {row.shipperName} · {row.load.referenceNumber}
                  </p>
                  <p className="text-xs text-zinc-600">
                    {row.load.originCity}, {row.load.originState} → {row.load.destinationCity},{" "}
                    {row.load.destinationState} · PU {formatDisplayDate(row.load.requestedPickupAt)}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    Load rate:{" "}
                    {row.load.offeredRateUsd != null
                      ? formatMoney(row.load.offeredRateUsd, row.load.offerCurrency)
                      : "not posted — will use your asking rate"}{" "}
                    · Asking{" "}
                    {formatMoney(
                      row.capacity.askingRateUsd,
                      inferOfferCurrency(
                        // Prefer load lane for currency when capacity states missing
                        row.load.originState,
                        row.load.destinationState,
                      ),
                    )}
                  </p>
                  {row.note ? <p className="mt-1 text-xs text-zinc-500">{row.note}</p> : null}
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={interestBusy != null}
                    isLoading={interestBusy === row.id}
                    onClick={() => void reviewInterest(row.id, "ACCEPT")}
                  >
                    Accept &amp; book
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={interestBusy != null}
                    onClick={() => void reviewInterest(row.id, "DECLINE")}
                  >
                    Decline
                  </Button>
                </div>
              </li>
            ))}
          </ul>
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
                  label="Search origin"
                  placeholder="City or postal code…"
                  onResolved={(p) => {
                    setPost((o) => ({
                      ...o,
                      originZip: (p.zip || o.originZip).toUpperCase(),
                      originCity: p.city || o.originCity,
                      originState: (p.state || o.originState).slice(0, 2).toUpperCase(),
                    }));
                  }}
                />
                <PlaceAutocomplete
                  mode="geocode"
                  label="Search destination"
                  placeholder="City or postal code…"
                  onResolved={(p) => {
                    setPost((o) => ({
                      ...o,
                      destinationZip: (p.zip || o.destinationZip).toUpperCase(),
                      destinationCity: p.city || o.destinationCity,
                      destinationState: (p.state || o.destinationState).slice(0, 2).toUpperCase(),
                    }));
                  }}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  required
                  className="rounded border px-3 py-2 text-sm"
                  placeholder="Origin city *"
                  value={post.originCity}
                  onChange={(e) => setPost((p) => ({ ...p, originCity: e.target.value }))}
                />
                <input
                  required
                  className="rounded border px-3 py-2 text-sm"
                  placeholder="Destination city *"
                  value={post.destinationCity}
                  onChange={(e) => setPost((p) => ({ ...p, destinationCity: e.target.value }))}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-4">
                <input
                  className="rounded border px-3 py-2 text-sm"
                  placeholder="Origin ST/prov"
                  maxLength={2}
                  value={post.originState}
                  onChange={(e) => setPost((p) => ({ ...p, originState: e.target.value.toUpperCase() }))}
                />
                <input
                  required
                  className="rounded border px-3 py-2 text-sm"
                  placeholder="Origin ZIP/postal *"
                  value={post.originZip}
                  onChange={(e) => setPost((p) => ({ ...p, originZip: e.target.value }))}
                />
                <input
                  className="rounded border px-3 py-2 text-sm"
                  placeholder="Dest ST/prov"
                  maxLength={2}
                  value={post.destinationState}
                  onChange={(e) => setPost((p) => ({ ...p, destinationState: e.target.value.toUpperCase() }))}
                />
                <input
                  required
                  className="rounded border px-3 py-2 text-sm"
                  placeholder="Dest ZIP/postal *"
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
              placeholder="Asking rate *"
              inputMode="decimal"
              value={post.askingRateUsd}
              onChange={(e) => setPost((p) => ({ ...p, askingRateUsd: e.target.value }))}
            />
            <p className="text-[11px] text-zinc-500">Canada–Canada in CAD. US–US in USD.</p>
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
                      {capacityLaneLabel(r)} · {r.equipmentType} · {capacityRateLabel(r)}
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
