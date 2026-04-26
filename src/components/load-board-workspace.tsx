"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { LobBrandStrip } from "@/components/lob-brand-strip";
import { LobSidebar, type LobSidebarStats } from "@/components/lob-sidebar";
import { useDistanceUnitPreference } from "@/components/providers/app-providers";
import { SupplierPostLoadForm } from "@/components/supplier-post-load-form";
import { LoadCard } from "@/components/load-card";
import { EmptyState, SearchIcon, TruckIcon } from "@/components/ui/empty-state";
import { FilterChip, FilterChipGroup } from "@/components/ui/filter-chip";
import { FloatingActionButton, PlusIcon } from "@/components/ui/floating-action-button";
import { Button } from "@/components/ui/button";
import { RadioChoice } from "@/components/ui/radio-choice";
import { LUMBER_EQUIPMENT, equipmentShortTag } from "@/lib/lumber-equipment";
import { formatMoney } from "@/lib/money";
import { parseRadiusToMiles } from "@/lib/units";
import { milesBetweenZips } from "@/lib/zip-distance";

/** Client-side summary only; server uses LOB_CAD_TO_USD_RATE for validation. */
const CAD_TO_USD_SUMMARY = 0.73;

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
  shipperCompanyId: string;
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
  const [emrZip, setEmrZip] = useState("");
  const [emrOriginRadius, setEmrOriginRadius] = useState("");
  const [emrDestRadius, setEmrDestRadius] = useState("");
  const [hideBrokers, setHideBrokers] = useState(false);
  const { distanceUnit, setDistanceUnit } = useDistanceUnitPreference();

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
      hideBrokers,
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

      <div className="min-w-0 flex-1">
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
              </FilterChipGroup>
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
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-600">From</label>
                <input
                  value={originQ}
                  onChange={(e) => setOriginQ(e.target.value)}
                  placeholder="City, state/province, postal or ZIP"
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-600">To</label>
                <input
                  value={destQ}
                  onChange={(e) => setDestQ(e.target.value)}
                  placeholder="City, state/province, postal or ZIP"
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm"
                />
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
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-zinc-600">EMR</span>
                    <span
                      className="cursor-help text-xs text-lob-navy underline decoration-dotted"
                      title="Empty Mile Radius — enter your current US/CA postal code and how far you are willing to deadhead to the load origin and/or destination."
                    >
                      Empty Mile Radius
                    </span>
                  </div>
                  <RadioChoice
                    label="Distance units for radius"
                    name="load-board-emr-unit"
                    value={distanceUnit}
                    onChange={setDistanceUnit}
                    options={[
                      { value: "mi", label: "Miles" },
                      { value: "km", label: "Kilometres" },
                    ]}
                    className="[&_label]:py-1.5 [&_label]:text-xs"
                  />
                </div>
                <p className="mt-1 text-[11px] text-zinc-500">
                  Great-circle distance between US ZIP or Canadian postal (FSA). Radii below use your selected unit;
                  filtering always compares in miles internally.
                </p>
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

        {/* Results table or cards */}
        {viewMode === "cards" ? (
        <div className="p-4 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
        <div className="overflow-x-auto px-2 sm:px-4">
          <table className="w-full min-w-[1020px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50/80 text-[10px] font-semibold uppercase tracking-[0.08em] text-stone-500">
                <th className="whitespace-nowrap px-4 py-3">Ref</th>
                <th className="whitespace-nowrap px-4 py-3">Age</th>
                <th className="whitespace-nowrap px-4 py-3">Rate</th>
                <th className="whitespace-nowrap px-4 py-3">Origin</th>
                <th className="whitespace-nowrap px-4 py-3">Dest</th>
                <th className="whitespace-nowrap px-4 py-3">Req PU</th>
                <th className="whitespace-nowrap px-4 py-3">Posted</th>
                <th className="whitespace-nowrap px-4 py-3">EQ</th>
                <th className="whitespace-nowrap px-4 py-3">Weight</th>
                <th className="min-w-[120px] px-4 py-3" title="Hidden on the open board until your company books the load.">
                  Mill / customer
                </th>
                <th className="whitespace-nowrap px-4 py-3">Status</th>
                <th className="min-w-[200px] px-4 py-3">Carrier / actions</th>
              </tr>
            </thead>
            <tbody className="text-zinc-800">
              {filteredLoads.map((load) => {
                const displayRate = load.booking
                  ? load.booking.agreedRateUsd
                  : (load.offeredRateUsd ?? null);
                const rateCurrency = load.booking ? load.booking.agreedCurrency : load.offerCurrency;
                return (
                  <tr
                    key={load.id}
                    className="border-b border-stone-100 hover:bg-lob-paper/80"
                  >
                    <td className="whitespace-nowrap px-2 py-2">
                      <Link
                        href={`/loads/${load.id}`}
                        className="font-semibold text-lob-navy underline decoration-lob-gold/50 hover:text-lob-navy-hover"
                      >
                        {load.referenceNumber}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 font-medium text-zinc-600">
                      {ageLabel(load.createdAt)}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 font-semibold">
                      {formatMoney(displayRate, rateCurrency)}
                    </td>
                    <td className="px-2 py-2">
                      <div className="font-medium">
                        {load.originCity}, {load.originState}
                      </div>
                      <div className="text-[10px] text-zinc-500">{load.originZip}</div>
                    </td>
                    <td className="px-2 py-2">
                      <div className="font-medium">
                        {load.destinationCity}, {load.destinationState}
                      </div>
                      <div className="text-[10px] text-zinc-500">{load.destinationZip}</div>
                    </td>
                    <td className="whitespace-nowrap px-2 py-2">{postedDateLabel(load.requestedPickupAt)}</td>
                    <td className="whitespace-nowrap px-2 py-2">{postedDateLabel(load.createdAt)}</td>
                    <td className="whitespace-nowrap px-2 py-2" title={load.equipmentType}>
                      {equipmentShortTag(load.equipmentType)}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2">{load.weightLbs.toLocaleString()}</td>
                    <td
                      className="max-w-[160px] px-2 py-2 text-zinc-700"
                      title={
                        load.shipperCompanyName ??
                        "Not shown on the open board. After you book, the mill or wholesaler name appears here."
                      }
                    >
                      {load.shipperCompanyName ? (
                        <span className="block truncate font-medium">{load.shipperCompanyName}</span>
                      ) : (
                        <span className="text-zinc-400 italic">Private until booked</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2">
                      <span
                        className={
                          load.status === "POSTED"
                            ? "rounded bg-lob-paper px-1.5 py-0.5 text-[10px] font-semibold text-lob-navy ring-1 ring-stone-200"
                            : load.status === "BOOKED"
                              ? "rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-900"
                              : "text-[10px] text-zinc-600"
                        }
                      >
                        {load.status}
                      </span>
                      {load.isRush && (
                        <span className="ml-1 text-[10px] font-bold text-amber-600">RUSH</span>
                      )}
                    </td>
                    <td className="px-2 py-2 align-top">
                      <div className="space-y-2 text-[11px]">
                        <div className="text-zinc-600">
                          {load.booking ? (
                            load.booking.carrierCompany.legalName ? (
                              <span>{load.booking.carrierCompany.legalName}</span>
                            ) : (
                              <span className="italic text-zinc-500">Booked</span>
                            )
                          ) : (
                            "—"
                          )}
                        </div>
                        {load.status === "POSTED" && isDispatcher && (
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="text-[10px] text-zinc-500">{load.offerCurrency}</span>
                            <input
                              className="w-20 rounded border px-1 py-0.5"
                              placeholder="$"
                              value={bookRate[load.id] ?? ""}
                              onChange={(e) => setBookRate((m) => ({ ...m, [load.id]: e.target.value }))}
                            />
                            <button
                              type="button"
                              disabled={busyId === load.id}
                              className="rounded bg-lob-navy px-2 py-0.5 font-semibold text-white hover:bg-lob-navy-hover disabled:opacity-50"
                              onClick={() => bookLoad(load.id)}
                            >
                              Book
                            </button>
                          </div>
                        )}
                        {load.status === "BOOKED" &&
                          load.booking?.carrierCompanyId === actor.companyId &&
                          isDispatcher &&
                          !load.dispatchLink && (
                            <div className="space-y-1 rounded border border-purple-200 bg-purple-50/90 p-2">
                              <input
                                className="mb-1 w-full rounded border px-1 py-0.5"
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
                              <div className="flex gap-1">
                                <input
                                  className="w-14 rounded border px-1 py-0.5"
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
                                <button
                                  type="button"
                                  disabled={busyId === `d-${load.id}`}
                                  className="rounded bg-purple-700 px-2 py-0.5 text-white disabled:opacity-50"
                                  onClick={() => dispatchLoad(load.id)}
                                >
                                  Driver link
                                </button>
                              </div>
                            </div>
                          )}
                        {load.dispatchLink && (
                          <div>
                            <button
                              type="button"
                              className="text-lob-navy underline"
                              onClick={() =>
                                copyText(
                                  `${typeof window !== "undefined" ? window.location.origin : ""}/driver/${load.dispatchLink!.token}`,
                                )
                              }
                            >
                              Copy driver URL
                            </button>
                            {load.uniquePickupCode && (
                              <div className="text-amber-800">Code {load.uniquePickupCode}</div>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
