"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { CarrierTypeTag } from "@/components/carrier-type-tag";
import { LoadStatusBadge } from "@/components/load-status-badge";
import { RateModeBadge } from "@/components/rate-mode-badge";
import { PlaceAutocomplete } from "@/components/place-autocomplete";
import { formatDisplayDate } from "@/lib/format-display-date";
import { formatMoney } from "@/lib/money";
import { displayLoadStatus, loadStatusSortRank } from "@/lib/load-status-label";
import { laneQueryTokenString } from "@/lib/place-helpers";

export type ShipmentRow = {
  id: string;
  referenceNumber: string;
  status: "POSTED" | "BOOKED" | "ASSIGNED" | "IN_TRANSIT" | "DELIVERED" | "CANCELLED" | "NEEDS_REPOST" | "UNLISTED";
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
  requestedDeliveryAt: string | null;
  postedAt: string;
  bookedAt: string | null;
  pickupConfirmedAt: string | null;
  deliveredAt: string | null;
  supplierDeliveredAt: string | null;
  rateUsd: number | null;
  rateCurrency: "USD" | "CAD";
  rateMode: "TAKE_IT" | "OPEN_BID";
  allowCounterOffers: boolean;
  shipperName: string;
  carrierName: string | null;
  carrierType: "ASSET_BASED" | "BROKER" | null;
  isOwnerOperator: boolean;
  hasDispatchLink: boolean;
};

export type ShipmentsActor = {
  role: "ADMIN" | "SHIPPER" | "DISPATCHER" | "GUEST";
  perspective: "shipper" | "carrier" | "admin";
};

type SortKey =
  | "pickupAt"
  | "deliveryAt"
  | "postedAt"
  | "bookedAt"
  | "rate"
  | "lane"
  | "status"
  | "carrier"
  | "shipper"
  | "weight"
  | "reference";

type FiltersState = {
  q: string;
  origin: string;
  destination: string;
  carrier: string;
  shipper: string;
  equipment: string;
  hideBrokers: boolean;
  rushOnly: boolean;
  pickupFrom: string;
  pickupTo: string;
};

const DEFAULT_FILTERS: FiltersState = {
  q: "",
  origin: "",
  destination: "",
  carrier: "",
  shipper: "",
  equipment: "",
  hideBrokers: false,
  rushOnly: false,
  pickupFrom: "",
  pickupTo: "",
};

function statusLabel(s: ShipmentRow["status"]): string {
  return displayLoadStatus(s);
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
      setSortDir(key === "status" ? "asc" : "desc");
    }
  }

  const filtered = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    const orig = filters.origin.trim().toLowerCase();
    const dest = filters.destination.trim().toLowerCase();
    const carr = filters.carrier.trim().toLowerCase();
    const ship = filters.shipper.trim().toLowerCase();
    const eq = filters.equipment.trim().toLowerCase();
    const fromTs = filters.pickupFrom ? new Date(filters.pickupFrom).getTime() : -Infinity;
    const toTs = filters.pickupTo
      ? new Date(filters.pickupTo).getTime() + 86400000 - 1
      : Infinity;

    return shipments.filter((r) => {
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
          case "deliveryAt":
            return (
              (a.requestedDeliveryAt ? new Date(a.requestedDeliveryAt).getTime() : 0) -
              (b.requestedDeliveryAt ? new Date(b.requestedDeliveryAt).getTime() : 0)
            );
          case "postedAt":
            return new Date(a.postedAt).getTime() - new Date(b.postedAt).getTime();
          case "bookedAt":
            return (a.bookedAt ? new Date(a.bookedAt).getTime() : 0) - (b.bookedAt ? new Date(b.bookedAt).getTime() : 0);
          case "rate":
            return (a.rateUsd ?? 0) - (b.rateUsd ?? 0);
          case "weight":
            return a.weightLbs - b.weightLbs;
          case "lane":
            return `${a.originState}${a.destinationState}`.localeCompare(`${b.originState}${b.destinationState}`);
          case "status":
            return loadStatusSortRank(a.status) - loadStatusSortRank(b.status);
          case "carrier":
            return (a.carrierName ?? "").localeCompare(b.carrierName ?? "");
          case "shipper":
            return a.shipperName.localeCompare(b.shipperName);
          case "reference":
            return a.referenceNumber.localeCompare(b.referenceNumber);
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
      "Reference",
      "Status",
      "Posted",
      "Pickup date",
      "Delivery",
      "Booked date",
      "Origin city",
      "Origin state",
      "Origin zip",
      "Destination city",
      "Destination state",
      "Destination zip",
      "Equipment",
      "Weight (lbs)",
      "Rate",
      "Currency",
      ...(actor.perspective === "shipper" ? [] : ["Shipper"]),
      ...(actor.perspective === "carrier" ? [] : ["Carrier", "Carrier type", "Owner-op"]),
    ];
    const rows: string[][] = [headers];
    for (const r of sorted) {
      rows.push([
        r.referenceNumber,
        statusLabel(r.status),
        r.postedAt,
        new Date(r.requestedPickupAt).toISOString(),
        r.requestedDeliveryAt ?? "",
        r.bookedAt ?? "",
        r.originCity,
        r.originState,
        r.originZip,
        r.destinationCity,
        r.destinationState,
        r.destinationZip,
        r.equipmentType,
        String(r.weightLbs),
        r.rateUsd != null ? r.rateUsd.toFixed(2) : "",
        r.rateCurrency,
        ...(actor.perspective === "shipper" ? [] : [r.shipperName]),
        ...(actor.perspective === "carrier"
          ? []
          : [r.carrierName ?? "", r.carrierType ?? "", r.isOwnerOperator ? "Y" : ""]),
      ]);
    }
    downloadCsv(`lob-shipments-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  }

  const showShipperColumn = actor.perspective !== "shipper";
  const showCarrierColumn = actor.perspective !== "carrier";
  const searchPlaceholder =
    actor.perspective === "shipper"
      ? "Reference, lane, carrier…"
      : actor.perspective === "carrier"
        ? "Reference, lane, shipper…"
        : "Reference, lane, carrier, shipper…";

  return (
    <div>
      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col text-xs">
            <span className="font-semibold uppercase tracking-wide text-stone-500">Search</span>
            <input
              type="search"
              placeholder={searchPlaceholder}
              value={filters.q}
              onChange={(e) => update("q", e.target.value)}
              className="mt-1 w-64 rounded border border-stone-300 px-2 py-1.5 text-sm"
            />
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
            className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-lob-navy hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Export CSV ({sorted.length})
          </button>
        </div>
      </div>

      <p className="mt-3 text-xs text-stone-600">
        Showing <span className="font-semibold">{sorted.length}</span> of {shipments.length} shipments.
        <span className="hidden lg:inline"> Click any column header to sort.</span>
      </p>

      <ul className="mt-3 space-y-3 lg:hidden">
        {sorted.map((r) => (
          <li
            key={r.id}
            className={
              r.status === "NEEDS_REPOST"
                ? "lob-needs-repost-glow rounded-xl border border-amber-200/70 bg-white p-4"
                : "rounded-xl border border-stone-200 bg-white p-4"
            }
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <Link href={`/loads/${r.id}`} className="break-words font-semibold text-lob-navy underline">
                  {r.originCity}, {r.originState} → {r.destinationCity}, {r.destinationState}
                </Link>
                {r.isRush ? (
                  <span className="ml-1.5 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-900">
                    Rush
                  </span>
                ) : null}
                <p className="mt-1 text-xs font-medium text-stone-500">{r.referenceNumber}</p>
                <p className="mt-1 text-sm text-stone-600">
                  {r.equipmentType} · {r.weightLbs.toLocaleString()} lbs
                </p>
              </div>
              <LoadStatusBadge status={r.status} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-sm text-stone-600">
              <p>
                Pickup{" "}
                <span className="tabular-nums text-stone-800">
                  {formatDisplayDate(r.requestedPickupAt)}
                </span>
              </p>
              <p>
                Delivery{" "}
                <span className="tabular-nums text-stone-800">
                  {r.requestedDeliveryAt ? formatDisplayDate(r.requestedDeliveryAt) : "—"}
                </span>
              </p>
              <p className="col-span-2 text-xs text-stone-500">
                Posted <span className="tabular-nums">{formatDisplayDate(r.postedAt)}</span>
              </p>
            </div>
            <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
              <div className="inline-flex flex-col items-start gap-1">
                {r.status === "POSTED" ? (
                  <RateModeBadge rateMode={r.rateMode} allowCounterOffers={r.allowCounterOffers} compact />
                ) : null}
                <span className="text-sm font-semibold tabular-nums">
                  {r.rateUsd != null
                    ? formatMoney(r.rateUsd, r.rateCurrency)
                    : r.rateMode === "OPEN_BID"
                      ? "Open Bid"
                      : "—"}
                </span>
              </div>
            </div>
            {showCarrierColumn && r.carrierName ? (
              <div className="mt-2 flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-stone-600">
                <span className="break-words font-medium text-stone-700">{r.carrierName}</span>
                <CarrierTypeTag
                  carrierType={r.carrierType}
                  isOwnerOperator={r.isOwnerOperator}
                  compact
                />
              </div>
            ) : null}
            {showShipperColumn ? (
              <p className="mt-2 break-words text-xs text-stone-500">{r.shipperName}</p>
            ) : null}
            {r.hasDispatchLink ? (
              <p className="mt-1 text-[11px] font-medium text-emerald-800">Dispatch link active</p>
            ) : null}
          </li>
        ))}
        {sorted.length === 0 ? (
          <li className="rounded-xl border border-stone-200 bg-white p-8 text-center text-sm text-zinc-500">
            No shipments match these filters. Try clearing them, or post your first load.
          </li>
        ) : null}
      </ul>

      <div className="mt-3 hidden overflow-x-auto rounded-lg border border-zinc-200 bg-white lg:block">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead className="border-b bg-zinc-50 text-xs font-semibold uppercase text-zinc-600">
            <tr>
              <SortableTh label="Reference" k="reference" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
              <SortableTh label="Lane" k="lane" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
              <SortableTh label="Posted" k="postedAt" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
              <SortableTh label="Pickup" k="pickupAt" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
              <SortableTh label="Delivery" k="deliveryAt" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
              <SortableTh label="Status" k="status" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
              <SortableTh label="Equipment" k="weight" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
              <SortableTh label="Rate" k="rate" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} align="right" />
              {showShipperColumn && (
                <SortableTh label="Shipper" k="shipper" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
              )}
              {showCarrierColumn && (
                <SortableTh label="Carrier" k="carrier" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
              )}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr
                key={r.id}
                className={
                  r.status === "NEEDS_REPOST"
                    ? "lob-needs-repost-glow border-b border-amber-200/70"
                    : "border-b border-zinc-100 hover:bg-zinc-50/50"
                }
              >
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
                <td className="px-3 py-2 text-zinc-700 tabular-nums">{formatDisplayDate(r.postedAt)}</td>
                <td className="px-3 py-2 text-zinc-700 tabular-nums">{formatDisplayDate(r.requestedPickupAt)}</td>
                <td className="px-3 py-2 text-zinc-700 tabular-nums">
                  {r.requestedDeliveryAt ? formatDisplayDate(r.requestedDeliveryAt) : "—"}
                </td>
                <td className="min-w-[8.5rem] px-3 py-2">
                  <LoadStatusBadge status={r.status} />
                </td>
                <td className="px-3 py-2 text-zinc-700">
                  <div className="flex flex-col">
                    <span>{r.equipmentType}</span>
                    <span className="text-[11px] text-zinc-500 tabular-nums">
                      {r.weightLbs.toLocaleString()} lbs
                    </span>
                  </div>
                </td>
                <td className="min-w-[7.5rem] px-3 py-2 text-right">
                  <div className="inline-flex flex-col items-end gap-1">
                    {r.status === "POSTED" ? (
                      <RateModeBadge rateMode={r.rateMode} allowCounterOffers={r.allowCounterOffers} compact />
                    ) : null}
                    <span className="tabular-nums">
                      {r.rateUsd != null ? formatMoney(r.rateUsd, r.rateCurrency) : r.rateMode === "OPEN_BID" ? "Open Bid" : "—"}
                    </span>
                  </div>
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
              </tr>
            ))}
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
