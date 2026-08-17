"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { LobBrandStrip } from "@/components/lob-brand-strip";
import { LobSidebar, type LobSidebarStats } from "@/components/lob-sidebar";
import { useDistanceUnitPreference } from "@/components/providers/app-providers";
import { SavedSearchesBar } from "@/components/saved-searches-bar";
import { EmptyState, SearchIcon, TruckIcon } from "@/components/ui/empty-state";
import { FilterChip, FilterChipGroup } from "@/components/ui/filter-chip";
import { Button } from "@/components/ui/button";
import { PlaceAutocomplete } from "@/components/place-autocomplete";
import { LUMBER_EQUIPMENT } from "@/lib/lumber-equipment";
import { laneQueryTokenString } from "@/lib/place-helpers";
import {
  LUMBER_PANEL_TYPE_OPTIONS,
  LUMBER_SPECIES_OPTIONS,
  LUMBER_TREATMENT_OPTIONS,
} from "@/lib/lumber-spec";
import { formatDisplayDate } from "@/lib/format-display-date";
import { formatMoney } from "@/lib/money";
import { parseRadiusToMiles } from "@/lib/units";
import { milesBetweenZips } from "@/lib/zip-distance";

/** Client-side summary only; server uses LOB_CAD_TO_USD_RATE for validation. */
const CAD_TO_USD_SUMMARY = 0.73;

type BoardSortKey = "pickupAt" | "deliveryAt" | "postedAt" | "rate" | "lane" | "status" | "reference";

function statusLabel(status: string) {
  return status.replace(/_/g, " ");
}

function statusBadgeClass(status: string) {
  switch (status) {
    case "POSTED":
      return "bg-stone-100 text-stone-700 ring-stone-200";
    case "BOOKED":
      return "bg-blue-50 text-blue-900 ring-blue-200";
    case "ASSIGNED":
      return "bg-indigo-50 text-indigo-900 ring-indigo-200";
    case "IN_TRANSIT":
      return "bg-amber-50 text-amber-900 ring-amber-200";
    case "DELIVERED":
      return "bg-emerald-50 text-emerald-900 ring-emerald-200";
    case "CANCELLED":
      return "bg-rose-50 text-rose-900 ring-rose-200";
    default:
      return "bg-stone-100 text-stone-700 ring-stone-200";
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

export type SerializableLoad = {
  id: string;
  referenceNumber: string;
  originCity: string;
  originState: string;
  originZip: string;
  destinationCity: string;
  destinationState: string;
  destinationZip: string;
  weightLbs: number;
  equipmentType: string;
  isRush: boolean;
  status: string;
  uniquePickupCode: string | null;
  /** Hidden (null) for carriers browsing open loads — prevents correlating posts. */
  shipperCompanyId: string | null;
  /** Mill / wholesaler name; null when hidden from this viewer until their carrier books. */
  shipperCompanyName: string | null;
  offerCurrency: "USD" | "CAD";
  offeredRateUsd: number | null;
  requestedPickupAt: string;
  /** Null on older loads that predate delivery dates. */
  requestedDeliveryAt: string | null;
  createdAt: string;
  booking: null | {
    carrierCompanyId: string;
    agreedRateUsd: number;
    agreedCurrency: "USD" | "CAD";
    carrierCompany: {
      legalName: string;
      carrierType?: "ASSET_BASED" | "BROKER" | null;
      isOwnerOperator?: boolean | null;
    };
  };
  dispatchLink: null | { token: string; status: string };
  /** Optional structured lumber posting payload (see lib/lumber-spec.ts). */
  lumberSpec?: import("@/lib/lumber-spec").LumberSpec | null;
};

export type BoardActor = {
  userId: string | null;
  companyId: string | null;
  companyName: string | null;
  role: string | null;
  carrierApproved: boolean;
};

function toUsdEquivalentForSummary(l: SerializableLoad): number {
  if (l.booking) {
    const r = l.booking.agreedRateUsd;
    return l.booking.agreedCurrency === "CAD" ? r * CAD_TO_USD_SUMMARY : r;
  }
  const o = l.offeredRateUsd ?? 0;
  return l.offerCurrency === "CAD" ? o * CAD_TO_USD_SUMMARY : o;
}

type BoardStats = LobSidebarStats;

/**
 * Pure matcher used by the saved-searches "N new" badges. Mirrors the same
 * filter rules the workspace applies live so the badge count is honest.
 */
function loadMatchesPayload(
  l: SerializableLoad,
  p: import("@/lib/saved-searches").SavedSearchPayload,
): boolean {
  const o = `${l.originCity} ${l.originState} ${l.originZip}`.toLowerCase();
  const d = `${l.destinationCity} ${l.destinationState} ${l.destinationZip}`.toLowerCase();
  if (p.originQ && !o.includes(p.originQ.toLowerCase().trim())) return false;
  if (p.destQ && !d.includes(p.destQ.toLowerCase().trim())) return false;
  if (p.equipmentFilter && l.equipmentType !== p.equipmentFilter) return false;
  const min = Number(p.weightMin ?? "");
  if (p.weightMin && Number.isFinite(min) && l.weightLbs < min) return false;
  const max = Number(p.weightMax ?? "");
  if (p.weightMax && Number.isFinite(max) && l.weightLbs > max) return false;
  if (p.pickupFrom) {
    const start = new Date(p.pickupFrom).setHours(0, 0, 0, 0);
    if (new Date(l.requestedPickupAt).getTime() < start) return false;
  }
  if (p.pickupTo) {
    const end = new Date(p.pickupTo).setHours(23, 59, 59, 999);
    if (new Date(l.requestedPickupAt).getTime() > end) return false;
  }
  if (p.hideBrokers && l.booking?.carrierCompany?.carrierType === "BROKER") return false;
  if (p.lumberSpecies && l.lumberSpec?.species !== p.lumberSpecies) return false;
  if (p.lumberPanelType && l.lumberSpec?.panelType !== p.lumberPanelType) return false;
  if (p.lumberTreatment && l.lumberSpec?.treatment !== p.lumberTreatment) return false;
  if (p.lumberFragileOnly && !l.lumberSpec?.fragile) return false;
  if (p.lumberWeatherSensitiveOnly && !l.lumberSpec?.weatherSensitive) return false;
  if (typeof p.minRateUsd === "number") {
    const rate = toUsdEquivalentForSummary(l);
    if (rate < p.minRateUsd) return false;
  }
  return true;
}

export function LoadBoardWorkspace({
  loads,
  actor,
  stats,
}: {
  loads: SerializableLoad[];
  actor: BoardActor;
  stats: BoardStats;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bookRate, setBookRate] = useState<Record<string, string>>({});

  const [originQ, setOriginQ] = useState("");
  const [destQ, setDestQ] = useState("");
  const [moreFilters, setMoreFilters] = useState(false);
  const [equipmentFilter, setEquipmentFilter] = useState("");
  const [weightMin, setWeightMin] = useState("");
  const [weightMax, setWeightMax] = useState("");
  const [postedFrom, setPostedFrom] = useState("");
  const [postedTo, setPostedTo] = useState("");
  const [pickupFrom, setPickupFrom] = useState("");
  const [pickupTo, setPickupTo] = useState("");
  const [sortKey, setSortKey] = useState<BoardSortKey>("postedAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [emrZip, setEmrZip] = useState("");
  const [emrOriginRadius, setEmrOriginRadius] = useState("");
  const [emrDestRadius, setEmrDestRadius] = useState("");
  const [hideBrokers, setHideBrokers] = useState(false);
  const [lumberSpecies, setLumberSpecies] = useState("");
  const [lumberPanelType, setLumberPanelType] = useState("");
  const [lumberTreatment, setLumberTreatment] = useState("");
  const [lumberFragileOnly, setLumberFragileOnly] = useState(false);
  const [lumberWeatherSensitiveOnly, setLumberWeatherSensitiveOnly] = useState(false);
  const { distanceUnit, setDistanceUnit } = useDistanceUnitPreference();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const posted = params.get("posted");
    if (posted) {
      setMessage(posted);
      window.history.replaceState({}, "", "/");
    }
  }, []);

  const isShipper = actor.role === "SHIPPER" && Boolean(actor.companyId);
  const isCarrierAccount = actor.role === "DISPATCHER" && Boolean(actor.companyId);
  const isDispatcher = isCarrierAccount && actor.carrierApproved;

  const hasActiveFilters = Boolean(
    originQ ||
      destQ ||
      equipmentFilter ||
      weightMin ||
      weightMax ||
      postedFrom ||
      postedTo ||
      pickupFrom ||
      pickupTo ||
      emrZip ||
      hideBrokers ||
      lumberSpecies ||
      lumberPanelType ||
      lumberTreatment ||
      lumberFragileOnly ||
      lumberWeatherSensitiveOnly,
  );

  function clearAllFilters() {
    setOriginQ("");
    setDestQ("");
    setEquipmentFilter("");
    setWeightMin("");
    setWeightMax("");
    setPostedFrom("");
    setPostedTo("");
    setPickupFrom("");
    setPickupTo("");
    setEmrZip("");
    setEmrOriginRadius("");
    setEmrDestRadius("");
    setHideBrokers(false);
    setLumberSpecies("");
    setLumberPanelType("");
    setLumberTreatment("");
    setLumberFragileOnly(false);
    setLumberWeatherSensitiveOnly(false);
  }

  const filteredLoads = useMemo(() => {
    const originMi = emrOriginRadius.trim() ? parseRadiusToMiles(emrOriginRadius, distanceUnit) : null;
    const destMi = emrDestRadius.trim() ? parseRadiusToMiles(emrDestRadius, distanceUnit) : null;
    const emrZipTrim = emrZip.trim();

    const list = loads.filter((l) => {
      const o = `${l.originCity} ${l.originState} ${l.originZip}`.toLowerCase();
      const d = `${l.destinationCity} ${l.destinationState} ${l.destinationZip}`.toLowerCase();
      if (originQ.trim() && !o.includes(originQ.trim().toLowerCase())) return false;
      if (destQ.trim() && !d.includes(destQ.trim().toLowerCase())) return false;
      if (equipmentFilter && l.equipmentType !== equipmentFilter) return false;
      const min = Number(weightMin);
      if (weightMin.trim() && Number.isFinite(min) && l.weightLbs < min) return false;
      const max = Number(weightMax);
      if (weightMax.trim() && Number.isFinite(max) && l.weightLbs > max) return false;
      const posted = new Date(l.createdAt).getTime();
      if (postedFrom) {
        const start = new Date(postedFrom).setHours(0, 0, 0, 0);
        if (posted < start) return false;
      }
      if (postedTo) {
        const end = new Date(postedTo).setHours(23, 59, 59, 999);
        if (posted > end) return false;
      }
      const pu = new Date(l.requestedPickupAt).getTime();
      if (pickupFrom) {
        const start = new Date(pickupFrom).setHours(0, 0, 0, 0);
        if (pu < start) return false;
      }
      if (pickupTo) {
        const end = new Date(pickupTo).setHours(23, 59, 59, 999);
        if (pu > end) return false;
      }

      if (emrZipTrim) {
        if (originMi != null) {
          const miles = milesBetweenZips(emrZipTrim, l.originZip);
          if (miles == null || miles > originMi) return false;
        }
        if (destMi != null) {
          const miles = milesBetweenZips(emrZipTrim, l.destinationZip);
          if (miles == null || miles > destMi) return false;
        }
      }

      if (hideBrokers && l.booking?.carrierCompany?.carrierType === "BROKER") {
        return false;
      }

      if (lumberSpecies && l.lumberSpec?.species !== lumberSpecies) return false;
      if (lumberPanelType && l.lumberSpec?.panelType !== lumberPanelType) return false;
      if (lumberTreatment && l.lumberSpec?.treatment !== lumberTreatment) return false;
      if (lumberFragileOnly && !l.lumberSpec?.fragile) return false;
      if (lumberWeatherSensitiveOnly && !l.lumberSpec?.weatherSensitive) return false;

      return true;
    });

    const dir = sortDir === "asc" ? 1 : -1;
    const sorted = [...list];
    sorted.sort((a, b) => {
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
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          case "rate": {
            const ar = a.booking ? a.booking.agreedRateUsd : (a.offeredRateUsd ?? 0);
            const br = b.booking ? b.booking.agreedRateUsd : (b.offeredRateUsd ?? 0);
            return ar - br;
          }
          case "lane":
            return `${a.originState}${a.destinationState}`.localeCompare(`${b.originState}${b.destinationState}`);
          case "status":
            return a.status.localeCompare(b.status);
          case "reference":
            return a.referenceNumber.localeCompare(b.referenceNumber);
          default:
            return 0;
        }
      })();
      return v * dir;
    });
    return sorted;
  }, [
    loads,
    originQ,
    destQ,
    equipmentFilter,
    weightMin,
    weightMax,
    postedFrom,
    postedTo,
    pickupFrom,
    pickupTo,
    sortKey,
    sortDir,
    emrZip,
    emrOriginRadius,
    emrDestRadius,
    distanceUnit,
    hideBrokers,
    lumberSpecies,
    lumberPanelType,
    lumberTreatment,
    lumberFragileOnly,
    lumberWeatherSensitiveOnly,
  ]);

  const summary = useMemo(() => {
    const withRate = filteredLoads.filter((l) => l.offeredRateUsd != null || l.booking);
    const sum = withRate.reduce((acc, l) => acc + toUsdEquivalentForSummary(l), 0);
    const avg = withRate.length ? sum / withRate.length : null;
    return { count: filteredLoads.length, avgPostedOrBooked: avg };
  }, [filteredLoads]);

  function toggleSort(key: BoardSortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function exportCsv() {
    const headers = [
      "Reference",
      "Status",
      "Posted",
      "Pickup date",
      "Expected delivery",
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
    ];
    const rows: string[][] = [headers];
    for (const l of filteredLoads) {
      const rate = l.booking ? l.booking.agreedRateUsd : l.offeredRateUsd;
      const currency = l.booking ? l.booking.agreedCurrency : l.offerCurrency;
      rows.push([
        l.referenceNumber,
        l.status,
        l.createdAt,
        l.requestedPickupAt,
        l.requestedDeliveryAt ?? "",
        l.originCity,
        l.originState,
        l.originZip,
        l.destinationCity,
        l.destinationState,
        l.destinationZip,
        l.equipmentType,
        String(l.weightLbs),
        rate != null ? String(rate) : "",
        currency,
      ]);
    }
    downloadCsv(`lob-open-loads-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  }

  function swapOriginDest() {
    const t = originQ;
    setOriginQ(destQ);
    setDestQ(t);
  }

  async function refresh(msg: string) {
    setMessage(msg);
    router.refresh();
  }

  async function bookLoad(loadId: string, agreedRateOverride?: number) {
    const rate =
      agreedRateOverride != null && Number.isFinite(agreedRateOverride)
        ? agreedRateOverride
        : Number(bookRate[loadId] ?? "");
    if (!Number.isFinite(rate) || rate <= 0) {
      setMessage("Enter a valid agreed rate.");
      return;
    }
    const load = loads.find((x) => x.id === loadId);
    const agreedCurrency = load?.offerCurrency ?? "USD";
    setBusyId(loadId);
    const res = await fetch(`/api/loads/${loadId}/book`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agreedRateUsd: rate, agreedCurrency }),
    });
    const data = await res.json().catch(() => ({}));
    setBusyId(null);
    if (!res.ok) {
      setMessage(data.error ?? "Book failed.");
      return;
    }
    await refresh("Booked. Open Shipments to create a driver link.");
  }

  return (
    <div className="mx-auto flex max-w-[1680px] gap-0 overflow-hidden rounded-[1.25rem] border border-stone-200/35 bg-white shadow-[0_2px_40px_-12px_rgba(0,18,51,0.07)] lg:gap-0">
      <LobSidebar active="loads" stats={stats} />

      <div className="min-w-0 flex-1 overflow-x-hidden">
        <LobBrandStrip />
        {message && (
          <div className="border-b border-amber-200/80 bg-amber-50/90 px-6 py-3 text-sm text-amber-950 sm:px-8">
            {message}
          </div>
        )}

        {/* Search header */}
        <div className="border-b border-stone-100 bg-stone-50/50 px-6 py-6 sm:px-8 sm:py-8">
          <div className="mb-4">
            <h1 className="text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">Open Loads</h1>
            <p className="mt-1 text-sm text-zinc-600">
              Search freight posted by mills and wholesalers. Supplier names stay private until you book a load.
              {isCarrierAccount && !actor.carrierApproved ? (
                <> Your company is still pending approval — you can browse but not book yet.</>
              ) : null}
            </p>
          </div>
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm text-zinc-600">
              <span className="font-medium text-zinc-800">{summary.count}</span> load
              {summary.count !== 1 ? "s" : ""}
              {originQ || destQ ? " match your search" : " on the board"}
            </p>
            <button
              type="button"
              onClick={() => setMoreFilters((v) => !v)}
              className="text-xs font-medium text-lob-navy underline hover:no-underline"
            >
              {moreFilters ? "Hide extra filters" : "More filters (dates, EMR, equipment…)"}
            </button>
          </div>

          {hasActiveFilters && (
            <div className="mb-4">
              <FilterChipGroup onClearAll={clearAllFilters}>
                {originQ && (
                  <FilterChip onRemove={() => setOriginQ("")}>
                    From: {originQ}
                  </FilterChip>
                )}
                {destQ && (
                  <FilterChip onRemove={() => setDestQ("")}>
                    To: {destQ}
                  </FilterChip>
                )}
                {equipmentFilter && (
                  <FilterChip onRemove={() => setEquipmentFilter("")}>
                    Equipment: {equipmentFilter}
                  </FilterChip>
                )}
                {weightMin && (
                  <FilterChip onRemove={() => setWeightMin("")}>
                    Min weight: {Number(weightMin).toLocaleString()} lbs
                  </FilterChip>
                )}
                {weightMax && (
                  <FilterChip onRemove={() => setWeightMax("")}>
                    Max weight: {Number(weightMax).toLocaleString()} lbs
                  </FilterChip>
                )}
                {postedFrom && (
                  <FilterChip onRemove={() => setPostedFrom("")}>
                    Posted from: {formatDisplayDate(postedFrom)}
                  </FilterChip>
                )}
                {postedTo && (
                  <FilterChip onRemove={() => setPostedTo("")}>
                    Posted to: {formatDisplayDate(postedTo)}
                  </FilterChip>
                )}
                {pickupFrom && (
                  <FilterChip onRemove={() => setPickupFrom("")}>
                    Pickup from: {formatDisplayDate(pickupFrom)}
                  </FilterChip>
                )}
                {pickupTo && (
                  <FilterChip onRemove={() => setPickupTo("")}>
                    Pickup to: {formatDisplayDate(pickupTo)}
                  </FilterChip>
                )}
                {emrZip && (
                  <FilterChip
                    onRemove={() => {
                      setEmrZip("");
                      setEmrOriginRadius("");
                      setEmrDestRadius("");
                    }}
                  >
                    EMR from: {emrZip}
                  </FilterChip>
                )}
                {hideBrokers && (
                  <FilterChip onRemove={() => setHideBrokers(false)}>
                    Hide brokers
                  </FilterChip>
                )}
                {lumberSpecies && (
                  <FilterChip onRemove={() => setLumberSpecies("")}>
                    Species: {LUMBER_SPECIES_OPTIONS.find((o) => o.value === lumberSpecies)?.label ?? lumberSpecies}
                  </FilterChip>
                )}
                {lumberPanelType && (
                  <FilterChip onRemove={() => setLumberPanelType("")}>
                    Panel: {LUMBER_PANEL_TYPE_OPTIONS.find((o) => o.value === lumberPanelType)?.label ?? lumberPanelType}
                  </FilterChip>
                )}
                {lumberTreatment && (
                  <FilterChip onRemove={() => setLumberTreatment("")}>
                    Treatment: {LUMBER_TREATMENT_OPTIONS.find((o) => o.value === lumberTreatment)?.label ?? lumberTreatment}
                  </FilterChip>
                )}
                {lumberFragileOnly && (
                  <FilterChip onRemove={() => setLumberFragileOnly(false)}>
                    Fragile only
                  </FilterChip>
                )}
                {lumberWeatherSensitiveOnly && (
                  <FilterChip onRemove={() => setLumberWeatherSensitiveOnly(false)}>
                    Weather-sensitive only
                  </FilterChip>
                )}
              </FilterChipGroup>
            </div>
          )}

          {isDispatcher && actor.companyId && (
            <div className="mb-3">
              <SavedSearchesBar
                ownerKey={actor.companyId}
                currentLoads={loads.map((l) => ({ id: l.id, createdAt: l.createdAt }))}
                evaluateMatch={(p, stub) => {
                  const full = loads.find((x) => x.id === stub.id);
                  if (!full) return false;
                  return loadMatchesPayload(full, p);
                }}
                currentPayload={{
                  originQ,
                  destQ,
                  equipmentFilter,
                  weightMin,
                  weightMax,
                  pickupFrom,
                  pickupTo,
                  hideBrokers,
                  lumberSpecies,
                  lumberPanelType,
                  lumberTreatment,
                  lumberFragileOnly,
                  lumberWeatherSensitiveOnly,
                }}
                onApply={(p) => {
                  setOriginQ(p.originQ ?? "");
                  setDestQ(p.destQ ?? "");
                  setEquipmentFilter(p.equipmentFilter ?? "");
                  setWeightMin(p.weightMin ?? "");
                  setWeightMax(p.weightMax ?? "");
                  setPickupFrom(p.pickupFrom ?? "");
                  setPickupTo(p.pickupTo ?? "");
                  setHideBrokers(Boolean(p.hideBrokers));
                  setLumberSpecies(p.lumberSpecies ?? "");
                  setLumberPanelType(p.lumberPanelType ?? "");
                  setLumberTreatment(p.lumberTreatment ?? "");
                  setLumberFragileOnly(Boolean(p.lumberFragileOnly));
                  setLumberWeatherSensitiveOnly(Boolean(p.lumberWeatherSensitiveOnly));
                }}
              />
            </div>
          )}

          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <p className="text-xs text-zinc-600">
              Click a column header to sort. Showing {filteredLoads.length} open load
              {filteredLoads.length !== 1 ? "s" : ""}.
            </p>
            <button
              type="button"
              onClick={exportCsv}
              disabled={filteredLoads.length === 0}
              className="rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Export CSV ({filteredLoads.length})
            </button>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <PlaceAutocomplete
                  mode="geocode"
                  className="[&_label]:text-zinc-600"
                  label="From — search (places)"
                  placeholder="Type a city, address, or postal code…"
                  onResolved={(p) => setOriginQ(laneQueryTokenString(p))}
                />
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-600">From — filter text</label>
                  <input
                    value={originQ}
                    onChange={(e) => setOriginQ(e.target.value)}
                    placeholder="City, state/province, postal or ZIP"
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <PlaceAutocomplete
                  mode="geocode"
                  className="[&_label]:text-zinc-600"
                  label="To — search (places)"
                  placeholder="Type a city, address, or postal code…"
                  onResolved={(p) => setDestQ(laneQueryTokenString(p))}
                />
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-600">To — filter text</label>
                  <input
                    value={destQ}
                    onChange={(e) => setDestQ(e.target.value)}
                    placeholder="City, state/province, postal or ZIP"
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm"
                  />
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={swapOriginDest}
              className="shrink-0 rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-700 hover:bg-zinc-100"
              title="Swap from and to"
            >
              Swap
            </button>
          </div>

          {moreFilters && (
            <div className="mt-4 space-y-4 border-t border-zinc-200 pt-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-600">Equipment</label>
                  <select
                    value={equipmentFilter}
                    onChange={(e) => setEquipmentFilter(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="">All types</option>
                    {LUMBER_EQUIPMENT.map((e) => (
                      <option key={e.code} value={e.code}>
                        {e.label} ({e.code})
                      </option>
                    ))}
                    <option value="Dry van">Dry van (legacy)</option>
                    <option value="Flatbed">Flatbed (legacy)</option>
                    <option value="Reefer">Reefer (legacy)</option>
                    <option value="Step deck">Step deck (legacy)</option>
                    <option value="Hotshot">Hotshot (legacy)</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-600">Weight min (lbs)</label>
                  <input
                    value={weightMin}
                    onChange={(e) => setWeightMin(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                    placeholder="Any"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-600">Weight max (lbs)</label>
                  <input
                    value={weightMax}
                    onChange={(e) => setWeightMax(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                    placeholder="Any"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-600">Posted from</label>
                  <input
                    type="date"
                    value={postedFrom}
                    onChange={(e) => setPostedFrom(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-600">Posted to</label>
                  <input
                    type="date"
                    value={postedTo}
                    onChange={(e) => setPostedTo(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-600">Requested pickup from</label>
                  <input
                    type="date"
                    value={pickupFrom}
                    onChange={(e) => setPickupFrom(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-600">Requested pickup to</label>
                  <input
                    type="date"
                    value={pickupTo}
                    onChange={(e) => setPickupTo(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              {!isShipper && (
              <div className="rounded-lg border border-dashed border-zinc-300 bg-white px-3 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-zinc-600">EMR</span>
                  <span
                    className="cursor-help text-xs text-lob-navy underline decoration-dotted"
                    title="Empty Mile Radius — enter your current US/CA postal code and how far you are willing to deadhead to the load origin and/or destination."
                  >
                    Empty Mile Radius
                  </span>
                </div>
              <p className="mt-1 text-[11px] text-zinc-500">
                Great-circle distance between US ZIP or Canadian postal (FSA). Miles vs kilometres for these fields is
                set under{" "}
                <strong className="font-medium text-zinc-700">Carrier profile</strong>.
                Filtering always compares in miles internally.
              </p>
                <div className="mt-2 space-y-2 sm:col-span-3">
                  <PlaceAutocomplete
                    mode="geocode"
                    label="Your location (search) — fills ZIP / postal for radius"
                    placeholder="City or postal code…"
                    onResolved={(p) => {
                      if (p.zip) setEmrZip(p.zip);
                    }}
                    className="max-w-md [&_label]:text-xs"
                  />
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  <input
                    className="rounded border border-zinc-300 px-2 py-2 text-sm"
                    placeholder="Your ZIP or postal code"
                    value={emrZip}
                    onChange={(e) => setEmrZip(e.target.value)}
                  />
                  <input
                    className="rounded border border-zinc-300 px-2 py-2 text-sm"
                    placeholder={distanceUnit === "mi" ? "Max mi to origin (optional)" : "Max km to origin (optional)"}
                    value={emrOriginRadius}
                    onChange={(e) => setEmrOriginRadius(e.target.value)}
                  />
                  <input
                    className="rounded border border-zinc-300 px-2 py-2 text-sm"
                    placeholder={distanceUnit === "mi" ? "Max mi to destination (optional)" : "Max km to destination (optional)"}
                    value={emrDestRadius}
                    onChange={(e) => setEmrDestRadius(e.target.value)}
                  />
                </div>
              </div>
              )}
              <div className="rounded-lg border border-dashed border-zinc-300 bg-white px-3 py-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-zinc-600">Lumber spec</span>
                  <span className="text-[11px] text-zinc-500">
                    {isShipper
                      ? "Match loads where your posts included these lumber details."
                      : "Match loads where the posting supplier included these details."}
                  </span>
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  <label className="text-xs text-zinc-600">
                    Species
                    <select
                      value={lumberSpecies}
                      onChange={(e) => setLumberSpecies(e.target.value)}
                      className="mt-1 block w-full rounded border border-zinc-300 bg-white px-2 py-2 text-sm"
                    >
                      <option value="">Any species</option>
                      {LUMBER_SPECIES_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs text-zinc-600">
                    Panel type
                    <select
                      value={lumberPanelType}
                      onChange={(e) => setLumberPanelType(e.target.value)}
                      className="mt-1 block w-full rounded border border-zinc-300 bg-white px-2 py-2 text-sm"
                    >
                      <option value="">Any panel</option>
                      {LUMBER_PANEL_TYPE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs text-zinc-600">
                    Treatment
                    <select
                      value={lumberTreatment}
                      onChange={(e) => setLumberTreatment(e.target.value)}
                      className="mt-1 block w-full rounded border border-zinc-300 bg-white px-2 py-2 text-sm"
                    >
                      <option value="">Any treatment</option>
                      {LUMBER_TREATMENT_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-zinc-700">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 rounded border-zinc-300 text-lob-navy focus:ring-lob-navy/30"
                      checked={lumberFragileOnly}
                      onChange={(e) => setLumberFragileOnly(e.target.checked)}
                    />
                    Fragile only
                  </label>
                  <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-zinc-700">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 rounded border-zinc-300 text-lob-navy focus:ring-lob-navy/30"
                      checked={lumberWeatherSensitiveOnly}
                      onChange={(e) => setLumberWeatherSensitiveOnly(e.target.checked)}
                    />
                    Weather-sensitive only
                  </label>
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => router.refresh()}
              className="rounded-lg bg-lob-navy px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-lob-navy-hover"
            >
              Refresh list
            </button>
            {isDispatcher && (
              <span className="text-sm text-zinc-600">
                Book a load, then create the driver link from{" "}
                <Link href="/shipments" className="font-medium text-lob-navy underline">
                  Shipments
                </Link>
                .
              </span>
            )}
          </div>
        </div>

        {/* Carrier summary strip */}
        <div className="flex flex-wrap items-center gap-4 border-b border-stone-100 bg-white px-6 py-3.5 text-sm sm:px-8">
              <span className="text-zinc-600">
                Avg rate (filtered, ≈ USD):{" "}
                <span className="font-semibold text-zinc-900">
                  {summary.avgPostedOrBooked != null ? formatMoney(summary.avgPostedOrBooked, "USD") : "—"}
                </span>
              </span>
              <span className="text-zinc-400">·</span>
              <span className="text-zinc-600">
                Delivered all-time: <span className="font-semibold text-zinc-900">{stats.delivered}</span>
              </span>
        </div>

        <div className="p-4 sm:p-6">
          <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="border-b bg-zinc-50 text-xs font-semibold uppercase text-zinc-600">
                <tr>
                  <BoardSortableTh label="Reference" k="reference" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                  <BoardSortableTh label="Lane" k="lane" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                  <BoardSortableTh label="Posted" k="postedAt" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                  <BoardSortableTh label="Pickup" k="pickupAt" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                  <BoardSortableTh
                    label="Expected Delivery"
                    k="deliveryAt"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onClick={toggleSort}
                  />
                  <BoardSortableTh label="Status" k="status" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                  <th className="px-3 py-2">Equipment</th>
                  <BoardSortableTh
                    label="Rate"
                    k="rate"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onClick={toggleSort}
                    align="right"
                  />
                  {isDispatcher ? <th className="px-3 py-2">Actions</th> : null}
                </tr>
              </thead>
              <tbody>
                {filteredLoads.map((load) => {
                  const displayRate = load.offeredRateUsd;
                  const rateCurrency = load.offerCurrency;
                  const canBook = isDispatcher && load.status === "POSTED";
                  return (
                    <tr key={load.id} className="border-b border-zinc-100 align-top hover:bg-zinc-50/50">
                      <td className="px-3 py-2 font-medium">
                        <Link href={`/loads/${load.id}`} className="text-lob-navy underline">
                          {load.referenceNumber}
                        </Link>
                        {load.isRush && (
                          <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-900">
                            Rush
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-zinc-700">
                        {load.originCity}, {load.originState} → {load.destinationCity}, {load.destinationState}
                      </td>
                      <td className="px-3 py-2 text-zinc-700 tabular-nums">{formatDisplayDate(load.createdAt)}</td>
                      <td className="px-3 py-2 text-zinc-700 tabular-nums">
                        {formatDisplayDate(load.requestedPickupAt)}
                      </td>
                      <td className="px-3 py-2 text-zinc-700 tabular-nums">
                        {load.requestedDeliveryAt ? formatDisplayDate(load.requestedDeliveryAt) : "—"}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${statusBadgeClass(load.status)}`}
                        >
                          {statusLabel(load.status)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-zinc-700">
                        <div className="flex flex-col">
                          <span>{load.equipmentType}</span>
                          <span className="text-[11px] text-zinc-500 tabular-nums">
                            {load.weightLbs.toLocaleString()} lbs
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {displayRate != null ? formatMoney(displayRate, rateCurrency) : "—"}
                      </td>
                      {isDispatcher ? (
                        <td className="px-3 py-2">
                          {canBook ? (
                            <div className="flex min-w-[12rem] flex-wrap items-center gap-1.5">
                              <span className="text-[11px] text-zinc-500">{load.offerCurrency}</span>
                              <input
                                className="w-20 rounded border border-stone-300 px-2 py-1 text-xs"
                                placeholder="Rate"
                                value={bookRate[load.id] ?? ""}
                                onChange={(e) => setBookRate((m) => ({ ...m, [load.id]: e.target.value }))}
                              />
                              <Button
                                type="button"
                                size="sm"
                                disabled={busyId === load.id}
                                isLoading={busyId === load.id}
                                onClick={() => void bookLoad(load.id)}
                              >
                                Book
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-zinc-400">—</span>
                          )}
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        {filteredLoads.length === 0 && (
          <EmptyState
            icon={hasActiveFilters ? <SearchIcon /> : <TruckIcon />}
            title={hasActiveFilters ? "No loads match your filters" : "No open loads on the board yet"}
            description={
              hasActiveFilters
                ? "Try adjusting your filters or clearing them to see posted freight."
                : "Check back soon for new load postings."
            }
            action={
              hasActiveFilters ? (
                <Button type="button" variant="outline" onClick={clearAllFilters}>
                  Clear all filters
                </Button>
              ) : undefined
            }
          />
        )}
      </div>
    </div>
  );
}

function BoardSortableTh({
  label,
  k,
  sortKey,
  sortDir,
  onClick,
  align = "left",
}: {
  label: string;
  k: BoardSortKey;
  sortKey: BoardSortKey;
  sortDir: "asc" | "desc";
  onClick: (k: BoardSortKey) => void;
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
