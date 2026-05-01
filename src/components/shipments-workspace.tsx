"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { CarrierTypeTag } from "@/components/carrier-type-tag";
import { PlaceAutocomplete } from "@/components/place-autocomplete";
import { formatMoney } from "@/lib/money";
import { laneQueryTokenString } from "@/lib/place-helpers";
import type { LumberSpec } from "@/lib/lumber-spec";
import { summarizeLumberSpec } from "@/lib/lumber-spec";

export type ShipmentRow = {
  id: string;
  referenceNumber: string;
  status: "POSTED" | "BOOKED" | "ASSIGNED" | "IN_TRANSIT" | "DELIVERED" | "CANCELLED";
  isRush: boolean;
  equipmentType: string;
  weightLbs: number;
  originCity: string;
  originState: string;
  originZip: string;
  destinationCity: string;
  destinationState: string;
  destinationZip: string;
  requestedPickupAt: string;
  bookedAt: string | null;
  pickupConfirmedAt: string | null;
  deliveredAt: string | null;
  rateUsd: number | null;
  rateCurrency: "USD" | "CAD";
  shipperName: string;
  carrierName: string | null;
  carrierType: "ASSET_BASED" | "BROKER" | null;
  isOwnerOperator: boolean;
  hasDispatchLink: boolean;
  lumberSpec: LumberSpec | null;
};

export type ShipmentsActor = {
  role: "ADMIN" | "SHIPPER" | "DISPATCHER" | "GUEST";
  perspective: "shipper" | "carrier" | "admin";
};

type SortKey =
  | "pickupAt"
  | "bookedAt"
  | "rate"
  | "lane"
  | "status"
  | "carrier"
  | "shipper"
  | "weight";

type FiltersState = {
  q: string;
  status: "ALL" | "ACTIVE" | "DELIVERED" | "POSTED" | "CANCELLED";
  origin: string;
  destination: string;
  carrier: string;
  shipper: string;
  equipment: string;
  species: string;
  panelType: string;
  hideBrokers: boolean;
  rushOnly: boolean;
  pickupFrom: string;
  pickupTo: string;
};

const DEFAULT_FILTERS: FiltersState = {
  q: "",
  status: "ALL",
  origin: "",
  destination: "",
  carrier: "",
  shipper: "",
  equipment: "",
  species: "",
  panelType: "",
  hideBrokers: false,
  rushOnly: false,
  pickupFrom: "",
  pickupTo: "",
};

function statusLabel(s: ShipmentRow["status"]): string {
  switch (s) {
    case "POSTED": return "Posted";
    case "BOOKED": return "Booked";
    case "ASSIGNED": return "Driver assigned";
    case "IN_TRANSIT": return "In transit";
    case "DELIVERED": return "Delivered";
    case "CANCELLED": return "Cancelled";
  }
}

function statusBadge(s: ShipmentRow["status"]): string {
  switch (s) {
    case "POSTED": return "bg-stone-100 text-stone-700 ring-stone-200";
    case "BOOKED": return "bg-blue-50 text-blue-900 ring-blue-200";
    case "ASSIGNED": return "bg-indigo-50 text-indigo-900 ring-indigo-200";
    case "IN_TRANSIT": return "bg-amber-50 text-amber-900 ring-amber-200";
    case "DELIVERED": return "bg-emerald-50 text-emerald-900 ring-emerald-200";
    case "CANCELLED": return "bg-rose-50 text-rose-900 ring-rose-200";
  }
}

function csvEscape(v: unknown): string {
  if (v == null) return "";
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((r) => r.map(csvEscape).join(",")).join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function ShipmentsWorkspace({
  shipments,
  actor,
}: {
  shipments: ShipmentRow[];
  actor: ShipmentsActor;
}) {
  const [filters, setFilters] = useState<FiltersState>(DEFAULT_FILTERS);
  const [sortKey, setSortKey] = useState<SortKey>("pickupAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  function update<K extends keyof FiltersState>(key: K, value: FiltersState[K]) {
    setFilters((f) => ({ ...f, [key]: value }));
  }

  function clearAll() {
    setFilters(DEFAULT_FILTERS);
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const filtered = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    const orig = filters.origin.trim().toLowerCase();
    const dest = filters.destination.trim().toLowerCase();
    const carr = filters.carrier.trim().toLowerCase();
    const ship = filters.shipper.trim().toLowerCase();
    const eq = filters.equipment.trim().toLowerCase();
    const species = filters.species.trim().toLowerCase();
    const panel = filters.panelType.trim().toLowerCase();
    const fromTs = filters.pickupFrom ? new Date(filters.pickupFrom).getTime() : -Infinity;
    const toTs = filters.pickupTo
      ? new Date(filters.pickupTo).getTime() + 86400000 - 1
      : Infinity;

    return shipments.filter((r) => {
      if (filters.status === "ACTIVE" && (r.status === "DELIVERED" || r.status === "CANCELLED")) return false;
      if (filters.status === "DELIVERED" && r.status !== "DELIVERED") return false;
      if (filters.status === "POSTED" && r.status !== "POSTED") return false;
      if (filters.status === "CANCELLED" && r.status !== "CANCELLED") return false;

      if (filters.rushOnly && !r.isRush) return false;
      if (filters.hideBrokers && r.carrierType === "BROKER") return false;

      const pickupTs = new Date(r.requestedPickupAt).getTime();
      if (pickupTs < fromTs || pickupTs > toTs) return false;

      if (q) {
        const hay = `${r.referenceNumber} ${r.shipperName} ${r.carrierName ?? ""} ${r.originCity} ${r.destinationCity} ${r.equipmentType}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      if (orig) {
        const o = `${r.originCity} ${r.originState} ${r.originZip}`.toLowerCase();
        if (!o.includes(orig)) return false;
      }
      if (dest) {
        const d = `${r.destinationCity} ${r.destinationState} ${r.destinationZip}`.toLowerCase();
        if (!d.includes(dest)) return false;
      }
      if (carr && !(r.carrierName ?? "").toLowerCase().includes(carr)) return false;
      if (ship && !r.shipperName.toLowerCase().includes(ship)) return false;
      if (eq && !r.equipmentType.toLowerCase().includes(eq)) return false;

      if (species) {
        const s = (r.lumberSpec?.species ?? "").toLowerCase();
        if (!s.includes(species)) return false;
      }
      if (panel) {
        const p = (r.lumberSpec?.panelType ?? "").toLowerCase();
        if (!p.includes(panel)) return false;
      }

      return true;
    });
  }, [shipments, filters]);

  const sorted = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    const copy = [...filtered];
    copy.sort((a, b) => {
      const v = (() => {
        switch (sortKey) {
          case "pickupAt":
            return new Date(a.requestedPickupAt).getTime() - new Date(b.requestedPickupAt).getTime();
          case "bookedAt":
            return (a.bookedAt ? new Date(a.bookedAt).getTime() : 0) - (b.bookedAt ? new Date(b.bookedAt).getTime() : 0);
          case "rate":
            return (a.rateUsd ?? 0) - (b.rateUsd ?? 0);
          case "weight":
            return a.weightLbs - b.weightLbs;
          case "lane":
            return `${a.originState}${a.destinationState}`.localeCompare(`${b.originState}${b.destinationState}`);
          case "status":
            return a.status.localeCompare(b.status);
          case "carrier":
            return (a.carrierName ?? "").localeCompare(b.carrierName ?? "");
          case "shipper":
            return a.shipperName.localeCompare(b.shipperName);
          default:
            return 0;
        }
      })();
      return v * dir;
    });
    return copy;
  }, [filtered, sortKey, sortDir]);

  function exportCsv() {
    const headers = [
      "Reference", "Status", "Pickup date", "Booked date",
      "Origin city", "Origin state", "Origin zip",
      "Destination city", "Destination state", "Destination zip",
      "Equipment", "Weight (lbs)", "Rate", "Currency",
      "Shipper", "Carrier", "Carrier type", "Owner-op",
      "Species", "Panel type", "Treatment", "Grade",
    ];
    const rows: string[][] = [headers];
    for (const r of sorted) {
      rows.push([
        r.referenceNumber,
        r.status,
        new Date(r.requestedPickupAt).toISOString(),
        r.bookedAt ?? "",
        r.originCity, r.originState, r.originZip,
        r.destinationCity, r.destinationState, r.destinationZip,
        r.equipmentType,
        String(r.weightLbs),
        r.rateUsd != null ? r.rateUsd.toFixed(2) : "",
        r.rateCurrency,
        r.shipperName,
        r.carrierName ?? "",
        r.carrierType ?? "",
        r.isOwnerOperator ? "Y" : "",
        r.lumberSpec?.species ?? "",
        r.lumberSpec?.panelType ?? "",
        r.lumberSpec?.treatment ?? "",
        r.lumberSpec?.grade ?? "",
      ]);
    }
    downloadCsv(`lob-shipments-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  }

  const showShipperColumn = actor.perspective !== "shipper";
  const showCarrierColumn = actor.perspective !== "carrier";

  return (
    <div>
      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col text-xs">
            <span className="font-semibold uppercase tracking-wide text-stone-500">Search</span>
            <input
              type="search"
              placeholder="Reference, lane, carrier, shipper…"
              value={filters.q}
              onChange={(e) => update("q", e.target.value)}
              className="mt-1 w-64 rounded border border-stone-300 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="flex flex-col text-xs">
            <span className="font-semibold uppercase tracking-wide text-stone-500">Status</span>
            <select
              value={filters.status}
              onChange={(e) => update("status", e.target.value as FiltersState["status"])}
              className="mt-1 rounded border border-stone-300 px-2 py-1.5 text-sm"
            >
              <option value="ALL">All</option>
              <option value="ACTIVE">Active (booked → in-transit)</option>
              <option value="POSTED">Posted (no booking yet)</option>
              <option value="DELIVERED">Delivered</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </label>
          <div className="min-w-[10rem] max-w-[14rem]">
            <PlaceAutocomplete
              mode="geocode"
              label="Search origin (Places) →"
              className="[&>label]:font-semibold [&>label]:uppercase [&>label]:text-stone-500 [&>label]:tracking-wide"
              placeholder="City, ZIP, address…"
              onResolved={(p) => update("origin", laneQueryTokenString(p))}
            />
            <input
              aria-label="Origin filter text"
              placeholder="Or type origin (city, ST, ZIP)"
              value={filters.origin}
              onChange={(e) => update("origin", e.target.value)}
              className="mt-1.5 w-full rounded border border-stone-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div className="min-w-[10rem] max-w-[14rem]">
            <PlaceAutocomplete
              mode="geocode"
              label="Search destination (Places) →"
              className="[&>label]:font-semibold [&>label]:uppercase [&>label]:text-stone-500 [&>label]:tracking-wide"
              placeholder="City, ZIP, address…"
              onResolved={(p) => update("destination", laneQueryTokenString(p))}
            />
            <input
              aria-label="Destination filter text"
              placeholder="Or type destination"
              value={filters.destination}
              onChange={(e) => update("destination", e.target.value)}
              className="mt-1.5 w-full rounded border border-stone-300 px-2 py-1.5 text-sm"
            />
          </div>
          {showCarrierColumn && (
            <label className="flex flex-col text-xs">
              <span className="font-semibold uppercase tracking-wide text-stone-500">Carrier</span>
              <input
                placeholder="Carrier name"
                value={filters.carrier}
                onChange={(e) => update("carrier", e.target.value)}
                className="mt-1 w-44 rounded border border-stone-300 px-2 py-1.5 text-sm"
              />
            </label>
          )}
          {showShipperColumn && (
            <label className="flex flex-col text-xs">
              <span className="font-semibold uppercase tracking-wide text-stone-500">Shipper</span>
              <input
                placeholder="Shipper name"
                value={filters.shipper}
                onChange={(e) => update("shipper", e.target.value)}
                className="mt-1 w-44 rounded border border-stone-300 px-2 py-1.5 text-sm"
              />
            </label>
          )}
          <label className="flex flex-col text-xs">
            <span className="font-semibold uppercase tracking-wide text-stone-500">Equipment</span>
            <input
              placeholder="Flatbed, Conestoga…"
              value={filters.equipment}
              onChange={(e) => update("equipment", e.target.value)}
              className="mt-1 w-40 rounded border border-stone-300 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="flex flex-col text-xs">
            <span className="font-semibold uppercase tracking-wide text-stone-500">Species</span>
            <input
              placeholder="SPF, Doug fir…"
              value={filters.species}
              onChange={(e) => update("species", e.target.value)}
              className="mt-1 w-32 rounded border border-stone-300 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="flex flex-col text-xs">
            <span className="font-semibold uppercase tracking-wide text-stone-500">Panel</span>
            <input
              placeholder="OSB, plywood…"
              value={filters.panelType}
              onChange={(e) => update("panelType", e.target.value)}
              className="mt-1 w-32 rounded border border-stone-300 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="flex flex-col text-xs">
            <span className="font-semibold uppercase tracking-wide text-stone-500">Pickup from</span>
            <input
              type="date"
              value={filters.pickupFrom}
              onChange={(e) => update("pickupFrom", e.target.value)}
              className="mt-1 rounded border border-stone-300 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="flex flex-col text-xs">
            <span className="font-semibold uppercase tracking-wide text-stone-500">Pickup to</span>
            <input
              type="date"
              value={filters.pickupTo}
              onChange={(e) => update("pickupTo", e.target.value)}
              className="mt-1 rounded border border-stone-300 px-2 py-1.5 text-sm"
            />
          </label>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-1.5 text-xs text-stone-700">
            <input
              type="checkbox"
              checked={filters.rushOnly}
              onChange={(e) => update("rushOnly", e.target.checked)}
            />
            Rush only
          </label>
          {actor.perspective === "shipper" && (
            <label className="inline-flex items-center gap-1.5 text-xs text-stone-700">
              <input
                type="checkbox"
                checked={filters.hideBrokers}
                onChange={(e) => update("hideBrokers", e.target.checked)}
              />
              Hide brokers
            </label>
          )}
          <button
            type="button"
            onClick={clearAll}
            className="ml-auto rounded-md border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50"
          >
            Clear filters
          </button>
          <button
            type="button"
            onClick={exportCsv}
            disabled={sorted.length === 0}
            className="rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Export CSV ({sorted.length})
          </button>
        </div>
      </div>

      <p className="mt-3 text-xs text-stone-600">
        Showing <span className="font-semibold">{sorted.length}</span> of {shipments.length} shipments. Click any column
        header to sort.
      </p>

      <div className="mt-3 overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead className="border-b bg-zinc-50 text-xs font-semibold uppercase text-zinc-600">
            <tr>
              <SortableTh label="Reference" k="status" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
              <SortableTh label="Lane" k="lane" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
              <SortableTh label="Pickup" k="pickupAt" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
              <th className="px-3 py-2">Status</th>
              <SortableTh label="Equipment" k="weight" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
              <SortableTh label="Rate" k="rate" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} align="right" />
              {showShipperColumn && <SortableTh label="Shipper" k="shipper" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />}
              {showCarrierColumn && <SortableTh label="Carrier" k="carrier" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />}
              <th className="px-3 py-2">Specs</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => {
              const pills = summarizeLumberSpec(r.lumberSpec);
              return (
                <tr key={r.id} className="border-b border-zinc-100 hover:bg-zinc-50/50">
                  <td className="px-3 py-2 font-medium">
                    <Link href={`/loads/${r.id}`} className="text-lob-navy underline">
                      {r.referenceNumber}
                    </Link>
                    {r.isRush && (
                      <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-900">
                        Rush
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-zinc-700">
                    {r.originCity}, {r.originState} → {r.destinationCity}, {r.destinationState}
                  </td>
                  <td className="px-3 py-2 text-zinc-700 tabular-nums">
                    {new Date(r.requestedPickupAt).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${statusBadge(r.status)}`}
                    >
                      {statusLabel(r.status)}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-zinc-700">
                    <div className="flex flex-col">
                      <span>{r.equipmentType}</span>
                      <span className="text-[11px] text-zinc-500 tabular-nums">
                        {r.weightLbs.toLocaleString()} lbs
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {r.rateUsd != null ? formatMoney(r.rateUsd, r.rateCurrency) : "—"}
                  </td>
                  {showShipperColumn && (
                    <td className="max-w-[180px] truncate px-3 py-2 text-zinc-700">{r.shipperName}</td>
                  )}
                  {showCarrierColumn && (
                    <td className="max-w-[200px] px-3 py-2">
                      {r.carrierName ? (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="truncate text-zinc-700">{r.carrierName}</span>
                          <CarrierTypeTag
                            carrierType={r.carrierType}
                            isOwnerOperator={r.isOwnerOperator}
                            compact
                          />
                        </div>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                  )}
                  <td className="max-w-[260px] px-3 py-2">
                    {pills.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {pills.slice(0, 4).map((p) => (
                          <span
                            key={p}
                            className="inline-flex items-center rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-900 ring-1 ring-emerald-200"
                          >
                            {p}
                          </span>
                        ))}
                        {pills.length > 4 && (
                          <span className="text-[10px] text-stone-500">+{pills.length - 4}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-stone-400">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {sorted.length === 0 && (
          <p className="p-8 text-center text-sm text-zinc-500">
            No shipments match these filters. Try clearing them, or post your first load.
          </p>
        )}
      </div>
    </div>
  );
}

function SortableTh({
  label,
  k,
  sortKey,
  sortDir,
  onClick,
  align = "left",
}: {
  label: string;
  k: SortKey;
  sortKey: SortKey;
  sortDir: "asc" | "desc";
  onClick: (k: SortKey) => void;
  align?: "left" | "right";
}) {
  const active = sortKey === k;
  return (
    <th className={`px-3 py-2 ${align === "right" ? "text-right" : ""}`}>
      <button
        type="button"
        onClick={() => onClick(k)}
        className={`inline-flex items-center gap-1 ${active ? "text-zinc-900" : "text-zinc-600 hover:text-zinc-900"}`}
      >
        <span>{label}</span>
        <span className="text-[10px]">{active ? (sortDir === "asc" ? "▲" : "▼") : "↕"}</span>
      </button>
    </th>
  );
}
