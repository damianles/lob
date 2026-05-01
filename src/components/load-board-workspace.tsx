"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { LobBrandStrip } from "@/components/lob-brand-strip";
import { LobSidebar, type LobSidebarStats } from "@/components/lob-sidebar";
import { useDistanceUnitPreference } from "@/components/providers/app-providers";
import { SavedSearchesBar } from "@/components/saved-searches-bar";
import { SupplierPostLoadForm } from "@/components/supplier-post-load-form";
import { LoadCard } from "@/components/load-card";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { EmptyState, SearchIcon, TruckIcon } from "@/components/ui/empty-state";
import { FilterChip, FilterChipGroup } from "@/components/ui/filter-chip";
import { FloatingActionButton, PlusIcon } from "@/components/ui/floating-action-button";
import { Button } from "@/components/ui/button";
import { RadioChoice } from "@/components/ui/radio-choice";
import { PlaceAutocomplete } from "@/components/place-autocomplete";
import { LUMBER_EQUIPMENT, equipmentShortTag } from "@/lib/lumber-equipment";
import { laneQueryTokenString } from "@/lib/place-helpers";
import {
  LUMBER_PANEL_TYPE_OPTIONS,
  LUMBER_SPECIES_OPTIONS,
  LUMBER_TREATMENT_OPTIONS,
  summarizeLumberSpec,
} from "@/lib/lumber-spec";
import { formatMoney } from "@/lib/money";
import { parseRadiusToMiles } from "@/lib/units";
import { milesBetweenZips } from "@/lib/zip-distance";

/** Client-side summary only; server uses LOB_CAD_TO_USD_RATE for validation. */
const CAD_TO_USD_SUMMARY = 0.73;

const LOAD_BOARD_VIEW_KEY = "lob.loadBoardViewMode";

function boardStatusBadgeVariant(status: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    POSTED: "posted",
    BOOKED: "booked",
    ASSIGNED: "assigned",
    IN_TRANSIT: "in-transit",
    DELIVERED: "delivered",
    CANCELLED: "error",
  };
  return map[status] ?? "default";
}

function formatStatusLabel(status: string) {
  return status.replace(/_/g, " ");
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

function ageLabel(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const h = Math.floor(ms / 3600000);
  if (h < 1) return "<1h";
  if (h < 72) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

function postedDateLabel(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "numeric", day: "numeric" });
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
  const [postOpen, setPostOpen] = useState(false);
  const [bookRate, setBookRate] = useState<Record<string, string>>({});
  const [dispatchForm, setDispatchForm] = useState<Record<string, { driverName: string; hours: string }>>({});

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
  const [sortBy, setSortBy] = useState<"postedDesc" | "pickupAsc" | "pickupDesc">("postedDesc");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [isDesktop, setIsDesktop] = useState(false);
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
    const mq = window.matchMedia("(min-width: 768px)");
    const onChange = () => setIsDesktop(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const raw = window.localStorage.getItem(LOAD_BOARD_VIEW_KEY);
    if (raw === "cards" || raw === "table") {
      setViewMode(raw);
    }
  }, []);

  useEffect(() => {
    if (!isDesktop) return;
    window.localStorage.setItem(LOAD_BOARD_VIEW_KEY, viewMode);
  }, [isDesktop, viewMode]);

  const effectiveViewMode = isDesktop ? viewMode : "cards";

  const isShipper = actor.role === "SHIPPER" && Boolean(actor.companyId);
  const isDispatcher = actor.role === "DISPATCHER" && Boolean(actor.companyId) && actor.carrierApproved;

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

    const sorted = [...list];
    sorted.sort((a, b) => {
      if (sortBy === "postedDesc") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      const ap = new Date(a.requestedPickupAt).getTime();
      const bp = new Date(b.requestedPickupAt).getTime();
      return sortBy === "pickupAsc" ? ap - bp : bp - ap;
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
    sortBy,
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
    await refresh("Booked.");
  }

  async function dispatchLoad(
    loadId: string,
    override?: { driverName: string; hours: number },
  ) {
    const d = override
      ? { driverName: override.driverName, hours: String(override.hours) }
      : (dispatchForm[loadId] ?? { driverName: "", hours: "48" });
    if (!d.driverName.trim()) {
      setMessage("Driver name is required.");
      return;
    }
    const hours = Number(d.hours) || 48;
    setBusyId(`d-${loadId}`);
    const res = await fetch(`/api/loads/${loadId}/dispatch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        driverName: d.driverName.trim(),
        expiresInHours: hours,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusyId(null);
    if (!res.ok) {
      setMessage(data.error ?? "Dispatch failed.");
      return;
    }
    const path = data.driverViewUrl as string;
    const absolute =
      typeof window !== "undefined" ? `${window.location.origin}${path}` : path;
    await refresh(`Driver link: ${absolute}`);
  }

  function copyText(text: string) {
    void navigator.clipboard.writeText(text);
    setMessage("Copied to clipboard.");
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
              {moreFilters ? "Hide extra filters" : "More filters (sort, dates, EMR, equipment…)"}
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
                    Posted from: {new Date(postedFrom).toLocaleDateString()}
                  </FilterChip>
                )}
                {postedTo && (
                  <FilterChip onRemove={() => setPostedTo("")}>
                    Posted to: {new Date(postedTo).toLocaleDateString()}
                  </FilterChip>
                )}
                {pickupFrom && (
                  <FilterChip onRemove={() => setPickupFrom("")}>
                    Pickup from: {new Date(pickupFrom).toLocaleDateString()}
                  </FilterChip>
                )}
                {pickupTo && (
                  <FilterChip onRemove={() => setPickupTo("")}>
                    Pickup to: {new Date(pickupTo).toLocaleDateString()}
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
            <label className="text-xs font-medium text-zinc-600">
              Sort
              <select
                className="mt-1 block rounded-lg border border-zinc-300 bg-white px-2 py-2 text-sm"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              >
                <option value="postedDesc">Recently posted</option>
                <option value="pickupAsc">Pickup date (soonest)</option>
                <option value="pickupDesc">Pickup date (latest)</option>
              </select>
            </label>
            {isShipper && (
              <label
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50"
                title="Hide loads booked by brokers — only show asset-based carriers"
              >
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 rounded border-zinc-300 text-lob-navy focus:ring-lob-navy/30"
                  checked={hideBrokers}
                  onChange={(e) => setHideBrokers(e.target.checked)}
                />
                Hide brokers
              </label>
            )}
            {isDesktop && (
              <div className="ml-auto">
                <RadioChoice
                  label="View mode"
                  name="load-board-view-mode"
                  value={viewMode}
                  onChange={setViewMode}
                  options={[
                    { value: "cards", label: "Cards" },
                    { value: "table", label: "Table" },
                  ]}
                  className="[&_label]:px-3 [&_label]:py-2 [&_label]:text-sm"
                />
              </div>
            )}
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
                <strong className="font-medium text-zinc-700">Carrier profile</strong> (carriers) or{" "}
                <strong className="font-medium text-zinc-700">Carrier preferences</strong> (suppliers). Filtering always
                compares in miles internally.
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
              <div className="rounded-lg border border-dashed border-zinc-300 bg-white px-3 py-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-zinc-600">Lumber spec</span>
                  <span className="text-[11px] text-zinc-500">
                    Match loads where the supplier filled in these details on post.
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
            {isShipper && (
              <button
                type="button"
                onClick={() => setPostOpen((v) => !v)}
                className="rounded-lg border border-emerald-600 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
              >
                {postOpen ? "Close" : "Post a load"}
              </button>
            )}
            {isDispatcher && (
              <span className="text-sm text-zinc-600">Book a load, then create the driver link.</span>
            )}
          </div>
        </div>

        {isShipper && postOpen && (
          <SupplierPostLoadForm
            onCancel={() => setPostOpen(false)}
            onPosted={async (msg) => {
              setPostOpen(false);
              await refresh(msg);
            }}
          />
        )}

        {/* Lane summary strip */}
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

        {/* Results: cards on all small screens; desktop can choose a dense "table" (stacked) list. */}
        {effectiveViewMode === "cards" ? (
          <div className="p-3 max-w-full overflow-x-hidden min-w-0 sm:p-6">
            <div className="grid min-w-0 max-w-full gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredLoads.map((load) => (
                <LoadCard
                  key={load.id}
                  load={load}
                  actor={actor}
                  busyId={busyId}
                  onBook={(loadId, rate) => void bookLoad(loadId, rate)}
                  onDispatch={(loadId, driverName, hours) => void dispatchLoad(loadId, { driverName, hours })}
                  onCopyDriverLink={(url) => copyText(url)}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-full min-w-0 space-y-2.5 overflow-x-hidden px-3 py-1 pb-6 sm:px-6 sm:py-2">
            <div className="mx-auto max-w-5xl">
              {filteredLoads.map((load) => {
                const displayRate = load.booking ? load.booking.agreedRateUsd : (load.offeredRateUsd ?? null);
                const rateCurrency = load.booking ? load.booking.agreedCurrency : load.offerCurrency;
                const specPills = summarizeLumberSpec(load.lumberSpec);
                return (
                  <article
                    key={load.id}
                    className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-[0_1px_0_rgba(0,0,0,0.03)] transition hover:border-stone-300/80"
                  >
                    <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                          <Link
                            href={`/loads/${load.id}`}
                            className="font-semibold text-lob-navy underline decoration-lob-gold/40"
                          >
                            {load.referenceNumber}
                          </Link>
                          <span className="text-xs font-medium text-stone-500">{ageLabel(load.createdAt)}</span>
                          <span className="text-sm font-bold text-stone-900">
                            {formatMoney(displayRate, rateCurrency)}
                          </span>
                        </div>
                        <p className="mt-1.5 min-w-0 break-words text-sm font-medium text-stone-800">
                          {load.originCity}, {load.originState} → {load.destinationCity}, {load.destinationState}
                        </p>
                        <p className="mt-0.5 text-xs text-stone-500">
                          PU {postedDateLabel(load.requestedPickupAt)} · posted {postedDateLabel(load.createdAt)} ·{" "}
                          {equipmentShortTag(load.equipmentType)} · {load.weightLbs.toLocaleString()} lb
                        </p>
                        {specPills.length > 0 && (
                          <div className="mt-1.5 flex min-w-0 flex-wrap gap-1">
                            {specPills.map((p, i) => (
                              <span
                                key={`${load.id}-spec-${i}`}
                                className="inline-flex max-w-full truncate rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-700"
                              >
                                {p}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex min-w-0 flex-shrink-0 flex-col items-end gap-1.5">
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          <Badge variant={boardStatusBadgeVariant(load.status)} pulse={load.status === "IN_TRANSIT"}>
                            {formatStatusLabel(load.status)}
                          </Badge>
                          {load.isRush && (
                            <span className="text-[10px] font-bold uppercase text-amber-600">Rush</span>
                          )}
                        </div>
                        <p
                          className="max-w-[12rem] truncate text-right text-[11px] text-stone-600"
                          title={
                            load.shipperCompanyName ??
                            "Not shown on the open board. After you book, the mill or wholesaler name appears here."
                          }
                        >
                          {load.shipperCompanyName ? (
                            <span>{load.shipperCompanyName}</span>
                          ) : (
                            <span className="text-stone-400 italic">Private until booked</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 min-w-0 border-t border-stone-100 pt-3 text-xs text-stone-600">
                      <p className="min-w-0 break-words font-medium text-stone-800">
                        {load.booking ? (
                          load.booking.carrierCompany.legalName || (
                            <span className="text-stone-500 italic">Booked</span>
                          )
                        ) : (
                          "—"
                        )}
                      </p>
                      {load.status === "POSTED" && isDispatcher && (
                        <div className="mt-2 flex min-w-0 max-w-md flex-wrap items-center gap-2">
                          <span className="text-stone-500">{load.offerCurrency}</span>
                          <input
                            className="min-w-0 max-w-[7rem] flex-1 rounded-lg border border-stone-200 px-2 py-1.5"
                            placeholder="Rate"
                            value={bookRate[load.id] ?? ""}
                            onChange={(e) => setBookRate((m) => ({ ...m, [load.id]: e.target.value }))}
                          />
                          <Button
                            type="button"
                            size="sm"
                            disabled={busyId === load.id}
                            isLoading={busyId === load.id}
                            onClick={() => bookLoad(load.id)}
                          >
                            Book
                          </Button>
                        </div>
                      )}
                      {load.status === "BOOKED" &&
                        load.booking?.carrierCompanyId === actor.companyId &&
                        isDispatcher &&
                        !load.dispatchLink && (
                          <div className="mt-2 max-w-md space-y-1.5 rounded-xl border border-purple-200/90 bg-violet-50/60 p-2.5">
                            <input
                              className="w-full min-w-0 rounded-lg border border-stone-200 bg-white px-2 py-1.5"
                              placeholder="Driver name"
                              value={dispatchForm[load.id]?.driverName ?? ""}
                              onChange={(e) =>
                                setDispatchForm((m) => ({
                                  ...m,
                                  [load.id]: {
                                    driverName: e.target.value,
                                    hours: m[load.id]?.hours ?? "48",
                                  },
                                }))
                              }
                            />
                            <div className="flex flex-wrap items-stretch gap-2">
                              <input
                                className="w-20 rounded-lg border border-stone-200 bg-white px-2 py-1.5"
                                placeholder="Hrs"
                                value={dispatchForm[load.id]?.hours ?? "48"}
                                onChange={(e) =>
                                  setDispatchForm((m) => ({
                                    ...m,
                                    [load.id]: {
                                      driverName: m[load.id]?.driverName ?? "",
                                      hours: e.target.value,
                                    },
                                  }))
                                }
                              />
                              <Button
                                type="button"
                                size="sm"
                                variant="primary"
                                className="!bg-violet-600 shadow-sm hover:!bg-violet-700"
                                disabled={busyId === `d-${load.id}`}
                                isLoading={busyId === `d-${load.id}`}
                                onClick={() => dispatchLoad(load.id)}
                              >
                                Driver link
                              </Button>
                            </div>
                          </div>
                        )}
                      {load.dispatchLink && (
                        <div className="mt-2 min-w-0 break-words">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              copyText(
                                `${typeof window !== "undefined" ? window.location.origin : ""}/driver/${load.dispatchLink!.token}`,
                              )
                            }
                          >
                            Copy driver URL
                          </Button>
                          {load.uniquePickupCode && (
                            <p className="mt-1 text-amber-900/90">Pickup code {load.uniquePickupCode}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}
        {filteredLoads.length === 0 && (
          <EmptyState
            icon={hasActiveFilters ? <SearchIcon /> : <TruckIcon />}
            title={hasActiveFilters ? "No loads match your filters" : "No loads on the board yet"}
            description={
              hasActiveFilters
                ? "Try adjusting your search criteria or clearing some filters"
                : isShipper
                  ? "Post your first load to get started"
                  : "Check back soon for new load postings"
            }
            action={
              <>
                {hasActiveFilters && (
                  <Button type="button" variant="outline" onClick={clearAllFilters}>
                    Clear all filters
                  </Button>
                )}
                {isShipper && (
                  <Button type="button" variant="primary" onClick={() => setPostOpen(true)}>
                    Post a load
                  </Button>
                )}
              </>
            }
          />
        )}

        {isShipper && (
          <FloatingActionButton onClick={() => setPostOpen(true)} icon={<PlusIcon />} label="Post load" />
        )}
      </div>
    </div>
  );
}
