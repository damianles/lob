"use client";

import { useCallback, useEffect, useState } from "react";

import { AddressDataLists } from "@/components/address-datalists";
import { PlaceAutocomplete } from "@/components/place-autocomplete";
import { LanePriceChip } from "@/components/lane-price-chip";
import { LoadTemplatesPanel, type LoadTemplate } from "@/components/load-templates-panel";
import { LumberSpecForm } from "@/components/lumber-spec-form";
import { RecentPostsPicker } from "@/components/recent-posts-picker";
import { SavedLanesPanel, type SavedLane } from "@/components/saved-lanes-panel";
import { useViewerRole } from "@/components/providers/app-providers";
import { RadioChoice } from "@/components/ui/radio-choice";
import { LUMBER_EQUIPMENT } from "@/lib/lumber-equipment";
import { inferOfferCurrency } from "@/lib/lane-currency";
import { bandSide } from "@/lib/lane-decision-types";
import { formatMoney } from "@/lib/money";
import type { LumberSpec } from "@/lib/lumber-spec";
import {
  BID_WINDOW_PRESETS_HOURS,
  formatBidWindowHours,
  OPEN_BID_LABEL,
  TAKE_IT_LABEL,
} from "@/lib/rate-mode";

type CarrierPick = { id: string; legalName: string };

type PuDel = {
  address: string;
  postal: string;
  phone: string;
  date: string;
  time: string;
  window: string;
  appointment: string;
};

const emptyLoc: PuDel = {
  address: "",
  postal: "",
  phone: "",
  date: "",
  time: "",
  window: "",
  appointment: "",
};

function hasAnyLumberSpec(spec: LumberSpec): boolean {
  return Object.values(spec).some((v) => {
    if (v === undefined || v === null || v === "") return false;
    if (Array.isArray(v)) return v.length > 0;
    return true;
  });
}

export function SupplierPostLoadForm({
  onCancel,
  onPosted,
  pageLayout = false,
  showEntryPanels = true,
  seedLane = null,
  seedTemplate = null,
  clearDatesOnSeed = false,
}: {
  onCancel: () => void;
  onPosted: (msg: string) => void;
  /** Full-page chrome (no compact emerald strip header). */
  pageLayout?: boolean;
  /** When false, Saved Lanes / Recurring / Recent are handled by the parent chooser. */
  showEntryPanels?: boolean;
  seedLane?: SavedLane | null;
  seedTemplate?: LoadTemplate | null;
  /** Clear pickup/delivery dates after applying a recurring/recent seed. */
  clearDatesOnSeed?: boolean;
}) {
  const { viewer } = useViewerRole();
  const showFairMarketAdminCopy = viewer.kind === "ADMIN" && !viewer.simulated;

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [shipRef, setShipRef] = useState("");
  const [customerOrderNo, setCustomerOrderNo] = useState("");
  const [poNumber, setPoNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [urgency, setUrgency] = useState("3");
  const [requestedPickupDate, setRequestedPickupDate] = useState("");
  const [requestedDeliveryDate, setRequestedDeliveryDate] = useState("");

  const [originCity, setOriginCity] = useState("");
  const [originState, setOriginState] = useState("");
  const [originZip, setOriginZip] = useState("");
  const [destinationCity, setDestinationCity] = useState("");
  const [destinationState, setDestinationState] = useState("");
  const [destinationZip, setDestinationZip] = useState("");

  const [numPickups, setNumPickups] = useState(1);
  const [pickupCountry, setPickupCountry] = useState<"USA" | "CANADA">("USA");
  const [pickups, setPickups] = useState<PuDel[]>([{ ...emptyLoc }]);

  const [numDeliveries, setNumDeliveries] = useState(1);
  const [deliveryCountry, setDeliveryCountry] = useState<"USA" | "CANADA">("USA");
  const [deliveries, setDeliveries] = useState<PuDel[]>([{ ...emptyLoc }]);

  const [equipmentType, setEquipmentType] = useState<string>(LUMBER_EQUIPMENT[0].code);
  const [equipmentDetail, setEquipmentDetail] = useState("");
  const [ftlLtl, setFtlLtl] = useState<"FTL" | "LTL">("FTL");
  const [weightLbs, setWeightLbs] = useState("");
  const [weightUnit, setWeightUnit] = useState<"lb" | "kg">("lb");
  const [lumber, setLumber] = useState<LumberSpec>({});
  const [ltlPallets, setLtlPallets] = useState("");
  const [ltlPieces, setLtlPieces] = useState("");
  const [ltlLengthFt, setLtlLengthFt] = useState("");

  const [straps, setStraps] = useState(true);
  const [tarp, setTarp] = useState(false);
  const [chains, setChains] = useState(false);
  const [wash, setWash] = useState(false);
  const [puRequirements, setPuRequirements] = useState("");
  const [delRequirements, setDelRequirements] = useState("");

  const [permits, setPermits] = useState(false);
  const [permitNote, setPermitNote] = useState("");

  const [puAppt, setPuAppt] = useState(false);
  const [puDriverAssist, setPuDriverAssist] = useState(false);
  const [puCallBefore, setPuCallBefore] = useState(false);
  const [delAppt, setDelAppt] = useState(false);
  const [delDriverAssist, setDelDriverAssist] = useState(false);
  const [delCallBefore, setDelCallBefore] = useState(false);

  const [ppeVest, setPpeVest] = useState(true);
  const [ppeSteel, setPpeSteel] = useState(true);
  const [ppeHardHat, setPpeHardHat] = useState(false);
  const [ppeGlasses, setPpeGlasses] = useState(false);
  const [ppeOther, setPpeOther] = useState("");

  const [rateUsd, setRateUsd] = useState("");
  const [currency, setCurrency] = useState<"USD" | "CAD">("CAD");
  const [rateBand, setRateBand] = useState<{ floor: number; ceiling: number; bandEnforced: true } | null>(null);
  const onRateBand = useCallback((band: { floor: number; ceiling: number; bandEnforced: true } | null) => {
    setRateBand(band);
  }, []);
  const [rateMode, setRateMode] = useState<"TAKE_IT" | "OPEN_BID">("TAKE_IT");
  const [allowCounterOffers, setAllowCounterOffers] = useState(false);
  const [bidWindowHours, setBidWindowHours] = useState("24");
  const [bidUntilPickup, setBidUntilPickup] = useState(false);
  const [customBidHours, setCustomBidHours] = useState("");
  const [isRush, setIsRush] = useState(false);
  const [notes, setNotes] = useState("");
  const [tenderUrl, setTenderUrl] = useState("");

  const [papsRequired, setPapsRequired] = useState(false);
  const [papsNumber, setPapsNumber] = useState("");
  const [parsRequired, setParsRequired] = useState(false);
  const [parsNumber, setParsNumber] = useState("");

  const [carrierPicklist, setCarrierPicklist] = useState<CarrierPick[]>([]);
  const [blockedCarrierIds, setBlockedCarrierIds] = useState<Set<string>>(new Set());
  const [carrierVisibilityMode, setCarrierVisibilityMode] = useState<"OPEN" | "TIER_ASSIGNED">("OPEN");
  const [visibleTiers, setVisibleTiers] = useState<Set<1 | 2 | 3>>(new Set([1, 2, 3]));
  const [tierCounts, setTierCounts] = useState<{ 1: number; 2: number; 3: number }>({ 1: 0, 2: 0, 3: 0 });
  const [tierStagingEnabled, setTierStagingEnabled] = useState(false);
  const [tier1Hours, setTier1Hours] = useState("24");
  const [tier2Hours, setTier2Hours] = useState("24");
  const [perLoadExcluded, setPerLoadExcluded] = useState<Set<string>>(new Set());

  useEffect(() => {
    const n = Math.min(4, Math.max(1, numPickups));
    setPickups((prev) => {
      const next = [...prev];
      while (next.length < n) next.push({ ...emptyLoc });
      return next.slice(0, n);
    });
  }, [numPickups]);

  useEffect(() => {
    const n = Math.min(4, Math.max(1, numDeliveries));
    setDeliveries((prev) => {
      const next = [...prev];
      while (next.length < n) next.push({ ...emptyLoc });
      return next.slice(0, n);
    });
  }, [numDeliveries]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [rPick, rBlock, rTiers] = await Promise.all([
        fetch("/api/shipper/carrier-picklist"),
        fetch("/api/shipper/blocked-carriers"),
        fetch("/api/shipper/carrier-tiers"),
      ]);
      if (cancelled || !rPick.ok || !rBlock.ok) return;
      const jPick = await rPick.json();
      const jBlock = await rBlock.json();
      setCarrierPicklist(jPick.data ?? []);
      setBlockedCarrierIds(new Set((jBlock.data?.blocked ?? []).map((c: { id: string }) => c.id)));
      if (rTiers.ok) {
        const jTiers = await rTiers.json();
        const counts = jTiers.data?.counts;
        if (counts) {
          setTierCounts({
            1: Number(counts[1] ?? 0),
            2: Number(counts[2] ?? 0),
            3: Number(counts[3] ?? 0),
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function toggleVisibleTier(tier: 1 | 2 | 3) {
    setVisibleTiers((prev) => {
      const n = new Set(prev);
      if (n.has(tier)) n.delete(tier);
      else n.add(tier);
      return n;
    });
  }

  function setAllVisibleTiers() {
    setVisibleTiers(new Set([1, 2, 3]));
  }

  function togglePerLoadExclude(carrierId: string) {
    setPerLoadExcluded((s) => {
      const n = new Set(s);
      if (n.has(carrierId)) n.delete(carrierId);
      else n.add(carrierId);
      return n;
    });
  }

  function syncPickup(idx: number, patch: Partial<PuDel>) {
    setPickups((rows) => rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  function syncDelivery(idx: number, patch: Partial<PuDel>) {
    setDeliveries((rows) => rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  /**
   * Apply a saved-lane to the form. Address-only — explicitly does NOT
   * touch product/spec/rate/dates, so the user can re-fill those fresh
   * for each shipment without losing anything they already typed.
   */
  function applyLane(l: SavedLane) {
    setOriginCity(l.originCity);
    setOriginState(l.originState);
    setOriginZip(l.originZip);
    setDestinationCity(l.destinationCity);
    setDestinationState(l.destinationState);
    setDestinationZip(l.destinationZip);
    if (l.originAddress || l.originPhone) {
      setPickups((rows) => {
        const next = rows.length ? [...rows] : [{ ...emptyLoc }];
        next[0] = {
          ...next[0],
          address: l.originAddress ?? next[0].address,
          phone: l.originPhone ?? next[0].phone,
          postal: l.originZip || next[0].postal,
        };
        return next;
      });
    }
    if (l.destinationAddress || l.destinationPhone) {
      setDeliveries((rows) => {
        const next = rows.length ? [...rows] : [{ ...emptyLoc }];
        next[0] = {
          ...next[0],
          address: l.destinationAddress ?? next[0].address,
          phone: l.destinationPhone ?? next[0].phone,
          postal: l.destinationZip || next[0].postal,
        };
        return next;
      });
    }
  }

  /**
   * Shared "apply a template-shaped payload to the form" helper, reused by
   * the saved-template picker and the recent-posts picker so both have
   * identical behavior.
   */
  function applyTemplate(t: LoadTemplate) {
    if (t.originCity != null) setOriginCity(t.originCity);
    if (t.originState != null) setOriginState(t.originState);
    if (t.originZip != null) setOriginZip(t.originZip);
    if (t.destinationCity != null) setDestinationCity(t.destinationCity);
    if (t.destinationState != null) setDestinationState(t.destinationState);
    if (t.destinationZip != null) setDestinationZip(t.destinationZip);
    if (t.equipmentType) setEquipmentType(t.equipmentType);
    if (t.weightLbs != null) setWeightLbs(String(t.weightLbs));
    setIsRush(Boolean(t.isRush));
    if (t.defaultRateUsd != null) setRateUsd(String(t.defaultRateUsd));
    if (t.defaultCurrency) setCurrency(t.defaultCurrency);
    if (t.notes != null) setNotes(t.notes);
    if (t.lumberSpec) setLumber(t.lumberSpec);
  }

  useEffect(() => {
    if (seedLane) applyLane(seedLane);
    if (seedTemplate) {
      applyTemplate(seedTemplate);
      if (clearDatesOnSeed) {
        setRequestedPickupDate("");
        setRequestedDeliveryDate("");
      }
    }
    // One-shot seed when opening the form from the Post workspace chooser.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (originState.trim().length >= 2 && destinationState.trim().length >= 2) {
      setCurrency(inferOfferCurrency(originState, destinationState));
    }
  }, [originState, destinationState]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const rawWeight = Number(weightLbs);
    if (!Number.isFinite(rawWeight) || rawWeight <= 0) {
      setErr("Weight must be a positive number.");
      return;
    }
    const w = weightUnit === "kg" ? Math.round(rawWeight * 2.2046226218) : Math.round(rawWeight);
    if (equipmentType === "SPEC" && !equipmentDetail.trim()) {
      setErr("Describe the specialized equipment needed.");
      return;
    }
    if (permits && !permitNote.trim()) {
      setErr("Permit details are required when Permits is checked.");
      return;
    }
    if (!requestedPickupDate) {
      setErr("Requested pickup date is required.");
      return;
    }
    if (!requestedDeliveryDate) {
      setErr("Expected delivery date is required.");
      return;
    }
    if (requestedDeliveryDate < requestedPickupDate) {
      setErr("Delivery date cannot be before pickup date.");
      return;
    }
    const r = rateUsd.trim() === "" ? null : Number(rateUsd);
    if (rateMode === "TAKE_IT" && (r == null || !Number.isFinite(r) || r <= 0)) {
      setErr(`${TAKE_IT_LABEL} (${currency}) is required — this is the amount you pay.`);
      return;
    }
    if (rateMode === "OPEN_BID" && r != null && (!Number.isFinite(r) || r <= 0)) {
      setErr("Target rate must be a positive number, or leave it blank.");
      return;
    }
    if (r != null && Number.isFinite(r) && r > 0 && rateBand) {
      const side = bandSide(r, rateBand);
      if (side === "low") {
        setErr(`Rate is too low for this lane — must be at least ${formatMoney(rateBand.floor, currency)}.`);
        return;
      }
      if (side === "high") {
        setErr(`Rate is too high for this lane — must be at most ${formatMoney(rateBand.ceiling, currency)}.`);
        return;
      }
    }
    if (rateMode === "OPEN_BID" && !bidUntilPickup) {
      const hours = Number(customBidHours || bidWindowHours);
      if (!Number.isFinite(hours) || hours < 1 || hours > 336) {
        setErr("Set a bid window between 1 and 336 hours, or choose until pickup.");
        return;
      }
    }
    if (!originCity.trim() || !originState.trim() || !originZip.trim()) {
      setErr("Origin city, state or province, and postal or ZIP code are required (lane search).");
      return;
    }
    if (!destinationCity.trim() || !destinationState.trim() || !destinationZip.trim()) {
      setErr("Destination city, state or province, and postal or ZIP code are required.");
      return;
    }
    if (!pickups[0]?.address.trim()) {
      setErr("Pickup 1 address is required.");
      return;
    }
    if (!deliveries[0]?.address.trim()) {
      setErr("Delivery 1 address is required.");
      return;
    }

    if (carrierVisibilityMode === "TIER_ASSIGNED" && visibleTiers.size === 0) {
      setErr("Tier visibility: select at least one group (T1, T2, or T3) — or choose open visibility.");
      return;
    }

    const crossBorder = pickupCountry !== deliveryCountry;

    const extendedPosting = {
      commodity: "Lumber",
      shipRef: shipRef.trim() || undefined,
      customerOrderNo: customerOrderNo.trim() || undefined,
      poNumber: poNumber.trim() || undefined,
      customerName: customerName.trim() || undefined,
      urgency: Number(urgency) || 3,
      pickupCountry,
      deliveryCountry,
      pickups: pickups.map((p, i) => ({ ...p, index: i + 1 })),
      deliveries: deliveries.map((d, i) => ({ ...d, index: i + 1 })),
      ftlLtl,
      ltl:
        ftlLtl === "LTL"
          ? {
              pallets: ltlPallets ? Number(ltlPallets) : undefined,
              pieces: ltlPieces ? Number(ltlPieces) : undefined,
              lengthFt: ltlLengthFt ? Number(ltlLengthFt) : undefined,
            }
          : undefined,
      cleaning: wash ? "Wash" : tarp ? "Tarp" : "N/A",
      securement: chains ? "Chains" : straps ? "Straps" : "N/A",
      equipmentDetail: equipmentType === "SPEC" ? equipmentDetail.trim() : undefined,
      weightEntered: { value: rawWeight, unit: weightUnit },
      loadRequirements: {
        straps,
        tarp,
        chains,
        wash,
        pickupNotes: puRequirements.trim() || undefined,
        deliveryNotes: delRequirements.trim() || undefined,
      },
      permits: permits ? { note: permitNote.trim() } : undefined,
      pickupServices: {
        appointment: puAppt,
        driverAssist: puDriverAssist,
        callBefore: puCallBefore,
      },
      deliveryServices: {
        appointment: delAppt,
        driverAssist: delDriverAssist,
        callBefore: delCallBefore,
      },
      ppe: {
        vest: ppeVest,
        steelToes: ppeSteel,
        hardHat: ppeHardHat,
        safetyGlasses: ppeGlasses,
        other: ppeOther.trim() || undefined,
      },
      currency,
      notes: notes.trim() || undefined,
      tenderUrl: tenderUrl.trim() || undefined,
      crossBorder: crossBorder
        ? {
            papsRequired: papsRequired,
            papsNumber: papsRequired ? papsNumber.trim() : undefined,
            parsRequired: parsRequired,
            parsNumber: parsRequired ? parsNumber.trim() : undefined,
          }
        : undefined,
      lumber: hasAnyLumberSpec(lumber) ? lumber : undefined,
    };

    setBusy(true);
    const res = await fetch("/api/loads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        originCity: originCity.trim(),
        originState: originState.trim(),
        originZip: originZip.trim(),
        destinationCity: destinationCity.trim(),
        destinationState: destinationState.trim(),
        destinationZip: destinationZip.trim(),
        weightLbs: w,
        equipmentType,
        isRush,
        isPrivate: false,
        requestedPickupAt: requestedPickupDate,
        requestedDeliveryAt: requestedDeliveryDate,
        offerCurrency: currency,
        offeredRateUsd: r != null && Number.isFinite(r) && r > 0 ? r : undefined,
        rateMode,
        allowCounterOffers: rateMode === "TAKE_IT" ? allowCounterOffers : false,
        bidWindowHours:
          rateMode === "OPEN_BID" && !bidUntilPickup
            ? Number(customBidHours || bidWindowHours) || 24
            : undefined,
        bidUntilPickup: rateMode === "OPEN_BID" ? bidUntilPickup : false,
        extendedPosting,
        carrierVisibilityMode,
        visibleTiers: carrierVisibilityMode === "TIER_ASSIGNED" ? [...visibleTiers] : [],
        tierAssignments: [],
        tierStagingEnabled:
          carrierVisibilityMode === "TIER_ASSIGNED" && !isRush && tierStagingEnabled,
        tier1ExclusiveHours:
          carrierVisibilityMode === "TIER_ASSIGNED" && !isRush && tierStagingEnabled
            ? Number(tier1Hours) || 24
            : undefined,
        tier2ExclusiveHours:
          carrierVisibilityMode === "TIER_ASSIGNED" && !isRush && tierStagingEnabled
            ? Number(tier2Hours) || 24
            : undefined,
        perLoadExcludedCarrierIds: [...perLoadExcluded],
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setErr(typeof data.error === "string" ? data.error : JSON.stringify(data.error ?? "Post failed."));
      return;
    }
    onPosted(`Posted ${data.data?.referenceNumber ?? "load"}.`);
  }

  return (
    <div className={pageLayout ? "rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6" : "border-b border-emerald-200 bg-emerald-50/80 px-4 py-4"}>
      {!pageLayout && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-emerald-900">Post a lumber load (supplier)</h3>
          <button type="button" className="text-xs text-emerald-800 underline" onClick={onCancel}>
            Close
          </button>
        </div>
      )}
      {err && <p className={`${pageLayout ? "" : "mt-2"} text-sm text-red-800`}>{err}</p>}
      <form className="mt-3 space-y-6" onSubmit={submit}>
        <AddressDataLists />
        {showEntryPanels && (
          <>
            <SavedLanesPanel
              onPick={applyLane}
              getCurrentLane={() => ({
                originCity,
                originState,
                originZip,
                originAddress: pickups[0]?.address,
                originPhone: pickups[0]?.phone,
                destinationCity,
                destinationState,
                destinationZip,
                destinationAddress: deliveries[0]?.address,
                destinationPhone: deliveries[0]?.phone,
              })}
            />
            <LoadTemplatesPanel
              getCurrentSnapshot={() => ({
                originCity,
                originState,
                originZip,
                destinationCity,
                destinationState,
                destinationZip,
                equipmentType,
                weightLbs,
                isRush,
                isPrivate: false,
                rateUsd,
                currency,
                notes,
                lumber,
              })}
              onLoad={applyTemplate}
            />
            <RecentPostsPicker onLoad={applyTemplate} />
          </>
        )}
        <section className="rounded border border-emerald-200 bg-white/90 p-3">
          <h4 className="text-xs font-bold uppercase tracking-wide text-emerald-900">Priority</h4>
          <div className="mt-2">
            <RadioChoice
              label="Shipment type"
              name="load-priority"
              value={isRush ? "rush" : "standard"}
              onChange={(v) => setIsRush(v === "rush")}
              options={[
                { value: "standard", label: "Standard", description: "Normal transit window" },
                { value: "rush", label: "Rush", description: "Time-critical — flag for carriers" },
              ]}
            />
          </div>
        </section>

        <section className="rounded border border-emerald-200 bg-white/90 p-3">
          <h4 className="text-xs font-bold uppercase tracking-wide text-emerald-900">Basic</h4>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <input className="rounded border px-2 py-2 text-sm" placeholder="Ref / ship # (optional)" value={shipRef} onChange={(e) => setShipRef(e.target.value)} />
            <input className="rounded border px-2 py-2 text-sm" placeholder="Customer order # (optional)" value={customerOrderNo} onChange={(e) => setCustomerOrderNo(e.target.value)} />
            <input className="rounded border px-2 py-2 text-sm" placeholder="PO # (optional)" value={poNumber} onChange={(e) => setPoNumber(e.target.value)} />
            <input className="rounded border px-2 py-2 text-sm" placeholder="Customer name (optional)" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            <label className="flex flex-col text-xs text-zinc-600 sm:col-span-1">
              Shipment urgency (1–5)
              <select className="mt-1 rounded border px-2 py-2 text-sm" value={urgency} onChange={(e) => setUrgency(e.target.value)}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={String(n)}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col text-xs text-zinc-600">
              Requested pickup date *
              <input
                type="date"
                required
                className="mt-1 rounded border px-2 py-2 text-sm"
                value={requestedPickupDate}
                onChange={(e) => setRequestedPickupDate(e.target.value)}
              />
            </label>
            <label className="flex flex-col text-xs text-zinc-600">
              Expected delivery date *
              <input
                type="date"
                required
                className="mt-1 rounded border px-2 py-2 text-sm"
                value={requestedDeliveryDate}
                onChange={(e) => {
                  const v = e.target.value;
                  setRequestedDeliveryDate(v);
                  setDeliveries((rows) =>
                    rows.map((r, i) => (i === 0 ? { ...r, date: v || r.date } : r)),
                  );
                }}
              />
            </label>
          </div>
        </section>

        <section className="rounded border border-emerald-200 bg-white/90 p-3">
          <h4 className="text-xs font-bold uppercase tracking-wide text-emerald-900">Lane</h4>
          <p className="mt-1 text-xs text-zinc-500">
            Origin and destination for this load. Use Saved Lanes when you post often on the same route.
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
            <input
              className="rounded border px-2 py-2 text-sm"
              placeholder="Origin city *"
              value={originCity}
              onChange={(e) => setOriginCity(e.target.value)}
              list="recent-origin-cities"
              autoComplete="off"
              required
            />
            <input
              className="rounded border px-2 py-2 text-sm"
              placeholder="State / prov *"
              maxLength={2}
              value={originState}
              onChange={(e) => setOriginState(e.target.value)}
              list="recent-origin-states"
              autoComplete="off"
              required
            />
            <input
              className="rounded border px-2 py-2 text-sm"
              placeholder="Origin postal / ZIP *"
              value={originZip}
              onChange={(e) => setOriginZip(e.target.value)}
              list="recent-origin-zips"
              autoComplete="off"
              required
            />
            <input
              className="rounded border px-2 py-2 text-sm"
              placeholder="Dest city *"
              value={destinationCity}
              onChange={(e) => setDestinationCity(e.target.value)}
              list="recent-destination-cities"
              autoComplete="off"
              required
            />
            <input
              className="rounded border px-2 py-2 text-sm"
              placeholder="State / prov *"
              maxLength={2}
              value={destinationState}
              onChange={(e) => setDestinationState(e.target.value)}
              list="recent-destination-states"
              autoComplete="off"
              required
            />
            <input
              className="rounded border px-2 py-2 text-sm"
              placeholder="Dest postal / ZIP *"
              value={destinationZip}
              onChange={(e) => setDestinationZip(e.target.value)}
              list="recent-destination-zips"
              autoComplete="off"
              required
            />
          </div>
        </section>

        <section className="rounded border border-emerald-200 bg-white/90 p-3">
          <h4 className="text-xs font-bold uppercase tracking-wide text-emerald-900">Pickup</h4>
          <div className="mt-2 flex flex-wrap gap-3">
            <label className="text-xs text-zinc-600">
              # Stops
              <select className="ml-1 rounded border px-2 py-1 text-sm" value={numPickups} onChange={(e) => setNumPickups(Number(e.target.value))}>
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-zinc-600">
              Country
              <select className="ml-1 rounded border px-2 py-1 text-sm" value={pickupCountry} onChange={(e) => setPickupCountry(e.target.value as "USA" | "CANADA")}>
                <option value="USA">USA</option>
                <option value="CANADA">Canada</option>
              </select>
            </label>
          </div>
          {pickups.map((p, i) => (
            <div key={i} className="mt-3 grid gap-2 border-t border-emerald-100 pt-3 sm:grid-cols-2 lg:grid-cols-3">
              <p className="text-xs font-semibold text-zinc-700 sm:col-span-2 lg:col-span-3">Pickup {i + 1}</p>
              {(i === 0 || numPickups > 1) && (
                <div className="sm:col-span-2 lg:col-span-3">
                  <PlaceAutocomplete
                    mode="address"
                    label={i === 0 ? "Search street address (optional, fills line + postal)" : `Search pickup ${i + 1} (optional)`}
                    onResolved={(p) => {
                      const line = p.line1 || p.formattedAddress;
                      syncPickup(i, {
                        address: line,
                        postal: p.zip,
                      });
                    }}
                  />
                </div>
              )}
              <input className="rounded border px-2 py-2 text-sm sm:col-span-2" placeholder="Address *" value={p.address} onChange={(e) => syncPickup(i, { address: e.target.value })} required={i === 0} />
              <input className="rounded border px-2 py-2 text-sm" placeholder="Postal / ZIP" value={p.postal} onChange={(e) => syncPickup(i, { postal: e.target.value })} list="recent-origin-zips" autoComplete="off" />
              <input className="rounded border px-2 py-2 text-sm" placeholder="Phone" value={p.phone} onChange={(e) => syncPickup(i, { phone: e.target.value })} />
              <input className="rounded border px-2 py-2 text-sm" type="date" placeholder="Date" value={p.date} onChange={(e) => syncPickup(i, { date: e.target.value })} />
              <input className="rounded border px-2 py-2 text-sm" placeholder="Time / notes" value={p.time} onChange={(e) => syncPickup(i, { time: e.target.value })} />
              <input className="rounded border px-2 py-2 text-sm" placeholder="Window" value={p.window} onChange={(e) => syncPickup(i, { window: e.target.value })} />
              <input className="rounded border px-2 py-2 text-sm sm:col-span-2" placeholder="Appointment info" value={p.appointment} onChange={(e) => syncPickup(i, { appointment: e.target.value })} />
            </div>
          ))}
        </section>

        <section className="rounded border border-emerald-200 bg-white/90 p-3">
          <h4 className="text-xs font-bold uppercase tracking-wide text-emerald-900">Delivery</h4>
          <div className="mt-2 flex flex-wrap gap-3">
            <label className="text-xs text-zinc-600">
              # Stops
              <select className="ml-1 rounded border px-2 py-1 text-sm" value={numDeliveries} onChange={(e) => setNumDeliveries(Number(e.target.value))}>
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-zinc-600">
              Country
              <select className="ml-1 rounded border px-2 py-1 text-sm" value={deliveryCountry} onChange={(e) => setDeliveryCountry(e.target.value as "USA" | "CANADA")}>
                <option value="USA">USA</option>
                <option value="CANADA">Canada</option>
              </select>
            </label>
          </div>
          {deliveries.map((d, i) => (
            <div key={i} className="mt-3 grid gap-2 border-t border-emerald-100 pt-3 sm:grid-cols-2 lg:grid-cols-3">
              <p className="text-xs font-semibold text-zinc-700 sm:col-span-2 lg:col-span-3">Delivery {i + 1}</p>
              {(i === 0 || numDeliveries > 1) && (
                <div className="sm:col-span-2 lg:col-span-3">
                  <PlaceAutocomplete
                    mode="address"
                    label={i === 0 ? "Search street address (optional, fills line + postal)" : `Search delivery ${i + 1} (optional)`}
                    onResolved={(p) => {
                      const line = p.line1 || p.formattedAddress;
                      syncDelivery(i, {
                        address: line,
                        postal: p.zip,
                      });
                    }}
                  />
                </div>
              )}
              <input className="rounded border px-2 py-2 text-sm sm:col-span-2" placeholder="Address *" value={d.address} onChange={(e) => syncDelivery(i, { address: e.target.value })} required={i === 0} />
              <input className="rounded border px-2 py-2 text-sm" placeholder="Postal / ZIP" value={d.postal} onChange={(e) => syncDelivery(i, { postal: e.target.value })} list="recent-destination-zips" autoComplete="off" />
              <input className="rounded border px-2 py-2 text-sm" placeholder="Phone" value={d.phone} onChange={(e) => syncDelivery(i, { phone: e.target.value })} />
              <input className="rounded border px-2 py-2 text-sm" type="date" value={d.date} onChange={(e) => syncDelivery(i, { date: e.target.value })} required={i === 0} />
              <input className="rounded border px-2 py-2 text-sm" placeholder="Time" value={d.time} onChange={(e) => syncDelivery(i, { time: e.target.value })} />
              <input className="rounded border px-2 py-2 text-sm" placeholder="Window" value={d.window} onChange={(e) => syncDelivery(i, { window: e.target.value })} />
              <input className="rounded border px-2 py-2 text-sm sm:col-span-2" placeholder="Appointment info" value={d.appointment} onChange={(e) => syncDelivery(i, { appointment: e.target.value })} />
            </div>
          ))}
        </section>

        {pickupCountry !== deliveryCountry && (
          <section className="rounded border border-amber-200 bg-amber-50/80 p-3">
            <h4 className="text-xs font-bold uppercase tracking-wide text-amber-900">Cross-border</h4>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={papsRequired} onChange={(e) => setPapsRequired(e.target.checked)} />
                PAPS # applies
              </label>
              {papsRequired && <input className="rounded border px-2 py-2 text-sm" placeholder="PAPS number" value={papsNumber} onChange={(e) => setPapsNumber(e.target.value)} />}
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={parsRequired} onChange={(e) => setParsRequired(e.target.checked)} />
                PARS / ECI / CCM applies
              </label>
              {parsRequired && <input className="rounded border px-2 py-2 text-sm" placeholder="PARS / ECI / CCM #" value={parsNumber} onChange={(e) => setParsNumber(e.target.value)} />}
            </div>
          </section>
        )}

        <section className="rounded border border-emerald-200 bg-white/90 p-3">
          <h4 className="text-xs font-bold uppercase tracking-wide text-emerald-900">Load details</h4>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-xs text-zinc-600">
              Equipment *
              <select className="mt-1 w-full rounded border px-2 py-2 text-sm" value={equipmentType} onChange={(e) => setEquipmentType(e.target.value)}>
                {LUMBER_EQUIPMENT.map((e) => (
                  <option key={e.code} value={e.code}>
                    {e.label} ({e.code})
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-zinc-600">
              FTL / LTL
              <select className="mt-1 w-full rounded border px-2 py-2 text-sm" value={ftlLtl} onChange={(e) => setFtlLtl(e.target.value as "FTL" | "LTL")}>
                <option value="FTL">FTL</option>
                <option value="LTL">LTL</option>
              </select>
            </label>
            <label className="text-xs text-zinc-600">
              Weight *
              <div className="mt-1 flex gap-1">
                <input
                  className="min-w-0 flex-1 rounded border px-2 py-2 text-sm"
                  placeholder={weightUnit === "kg" ? "Weight kg" : "Weight lbs"}
                  value={weightLbs}
                  onChange={(e) => setWeightLbs(e.target.value)}
                  required
                />
                <select
                  className="rounded border px-2 py-2 text-sm"
                  value={weightUnit}
                  onChange={(e) => setWeightUnit(e.target.value as "lb" | "kg")}
                  aria-label="Weight unit"
                >
                  <option value="lb">lb</option>
                  <option value="kg">kg</option>
                </select>
              </div>
            </label>
          </div>
          {equipmentType === "SPEC" && (
            <label className="mt-2 block text-xs text-zinc-600">
              Specialized equipment details *
              <input
                className="mt-1 w-full rounded border px-2 py-2 text-sm"
                placeholder="e.g. lowboy, 53' step deck, oversize escort required"
                value={equipmentDetail}
                onChange={(e) => setEquipmentDetail(e.target.value)}
                required
              />
            </label>
          )}
          {ftlLtl === "LTL" && (
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              <input className="rounded border px-2 py-2 text-sm" placeholder="# Pallets" value={ltlPallets} onChange={(e) => setLtlPallets(e.target.value)} />
              <input className="rounded border px-2 py-2 text-sm" placeholder="# Pieces" value={ltlPieces} onChange={(e) => setLtlPieces(e.target.value)} />
              <input className="rounded border px-2 py-2 text-sm" placeholder="Length (ft)" value={ltlLengthFt} onChange={(e) => setLtlLengthFt(e.target.value)} />
            </div>
          )}
        </section>

        <LumberSpecForm value={lumber} onChange={setLumber} />

        <section className="rounded border border-emerald-200 bg-white/90 p-3">
          <h4 className="text-xs font-bold uppercase tracking-wide text-emerald-900">Load Requirements</h4>
          <p className="mt-1 text-xs text-zinc-500">Check all that apply.</p>
          <div className="mt-2 flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={straps} onChange={(e) => setStraps(e.target.checked)} />
              Straps
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={tarp} onChange={(e) => setTarp(e.target.checked)} />
              Tarp
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={chains} onChange={(e) => setChains(e.target.checked)} />
              Chains
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={wash} onChange={(e) => setWash(e.target.checked)} />
              Wash
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={permits} onChange={(e) => setPermits(e.target.checked)} />
              Permits
            </label>
          </div>
          {permits && (
            <label className="mt-2 block text-xs text-zinc-600">
              Permit details *
              <input
                className="mt-1 w-full rounded border px-2 py-2 text-sm"
                placeholder="Oversize, overweight, escort, etc."
                value={permitNote}
                onChange={(e) => setPermitNote(e.target.value)}
                required
              />
            </label>
          )}
        </section>

        <section className="rounded border border-emerald-200 bg-white/90 p-3">
          <h4 className="text-xs font-bold uppercase tracking-wide text-emerald-900">Services & PPE</h4>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <textarea className="rounded border px-2 py-2 text-sm" rows={2} placeholder="Pickup requirements / instructions" value={puRequirements} onChange={(e) => setPuRequirements(e.target.value)} />
            <textarea className="rounded border px-2 py-2 text-sm" rows={2} placeholder="Delivery requirements / instructions" value={delRequirements} onChange={(e) => setDelRequirements(e.target.value)} />
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold text-zinc-600">Pickup</p>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={puAppt} onChange={(e) => setPuAppt(e.target.checked)} />
                Appointment required
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={puDriverAssist} onChange={(e) => setPuDriverAssist(e.target.checked)} />
                Driver assist
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={puCallBefore} onChange={(e) => setPuCallBefore(e.target.checked)} />
                Call before
              </label>
            </div>
            <div>
              <p className="text-xs font-semibold text-zinc-600">Delivery</p>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={delAppt} onChange={(e) => setDelAppt(e.target.checked)} />
                Appointment required
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={delDriverAssist} onChange={(e) => setDelDriverAssist(e.target.checked)} />
                Driver assist
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={delCallBefore} onChange={(e) => setDelCallBefore(e.target.checked)} />
                Call before
              </label>
            </div>
          </div>
          <p className="mt-3 text-xs font-semibold text-zinc-600">PPE</p>
          <div className="mt-1 flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={ppeVest} onChange={(e) => setPpeVest(e.target.checked)} />
              Safety vest
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={ppeSteel} onChange={(e) => setPpeSteel(e.target.checked)} />
              Steel toes
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={ppeHardHat} onChange={(e) => setPpeHardHat(e.target.checked)} />
              Hard hat
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={ppeGlasses} onChange={(e) => setPpeGlasses(e.target.checked)} />
              Safety glasses
            </label>
            <input className="min-w-[12rem] rounded border px-2 py-1 text-sm" placeholder="Other PPE" value={ppeOther} onChange={(e) => setPpeOther(e.target.value)} />
          </div>
        </section>

        <section className="rounded border border-emerald-200 bg-white/90 p-3">
          <h4 className="text-xs font-bold uppercase tracking-wide text-emerald-900">Carrier Visibility</h4>
          <p className="mt-1 text-xs text-zinc-600">
            Manage excluded carriers and tier membership in{" "}
            <a className="font-medium text-lob-navy underline" href="/shipper/carrier-preferences">
              Carrier preferences
            </a>
            . On each post, choose Open or which tier groups can see this load.
          </p>
          <div className="mt-3">
            <RadioChoice
              label="Carrier Visibility"
              name="load-carrier-visibility"
              value={carrierVisibilityMode}
              onChange={setCarrierVisibilityMode}
              options={[
                {
                  value: "OPEN",
                  label: "Open",
                  description: "Approved carriers (except your excluded list) may see and book.",
                },
                {
                  value: "TIER_ASSIGNED",
                  label: "Tiers only",
                  description: "Only carriers in the tier groups you select below.",
                },
              ]}
              className="[&_label]:max-w-full [&_label]:items-start"
            />
          </div>
          {carrierVisibilityMode === "TIER_ASSIGNED" && (
            <div className="mt-4 space-y-3 rounded border border-zinc-200 bg-zinc-50/80 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="rounded border border-lob-navy/30 bg-white px-2.5 py-1 text-xs font-semibold text-lob-navy hover:bg-[#eef1f7]"
                  onClick={setAllVisibleTiers}
                >
                  All tiers
                </button>
                <span className="text-[11px] text-zinc-500">Select which saved groups can see this load</span>
              </div>
              <div className="flex flex-wrap gap-4 text-sm">
                {(
                  [
                    { tier: 1 as const, label: "T1 — Preferred", hint: "Primary carriers you call first" },
                    { tier: 2 as const, label: "T2 — Backup", hint: "Trusted backup capacity" },
                    { tier: 3 as const, label: "T3 — Overflow", hint: "Wider net when needed" },
                  ] as const
                ).map(({ tier, label, hint }) => (
                  <label key={tier} className="flex min-w-[10rem] cursor-pointer items-start gap-2">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={visibleTiers.has(tier)}
                      onChange={() => toggleVisibleTier(tier)}
                    />
                    <span>
                      <span className="font-medium text-zinc-900">{label}</span>
                      <span className="mt-0.5 block text-[11px] text-zinc-500">
                        {hint} · {tierCounts[tier]} saved
                      </span>
                    </span>
                  </label>
                ))}
              </div>
              {tierCounts[1] + tierCounts[2] + tierCounts[3] === 0 && (
                <p className="text-xs text-amber-800">
                  No carriers in your tiers yet. Add them under Carrier preferences before publishing with Tiers only.
                </p>
              )}
              {!isRush && (
                <div className="rounded border border-dashed border-zinc-300 bg-white p-3">
                  <label className="flex items-start gap-2 text-sm text-zinc-800">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={tierStagingEnabled}
                      onChange={(e) => setTierStagingEnabled(e.target.checked)}
                    />
                    <span>
                      <span className="font-medium">Staged release</span>
                      <span className="mt-0.5 block text-[11px] text-zinc-500">
                        Post to T1 first, then expand to T2 and T3 after the hours you set. Rush loads always release immediately.
                      </span>
                    </span>
                  </label>
                  {tierStagingEnabled && (
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <label className="text-xs font-medium text-zinc-600">
                        Hours T1-only before T2
                        <input
                          type="number"
                          min={1}
                          max={168}
                          className="mt-1 w-full rounded border px-2 py-2 text-sm"
                          value={tier1Hours}
                          onChange={(e) => setTier1Hours(e.target.value)}
                        />
                      </label>
                      <label className="text-xs font-medium text-zinc-600">
                        Extra hours before T3 (after T2)
                        <input
                          type="number"
                          min={1}
                          max={168}
                          className="mt-1 w-full rounded border px-2 py-2 text-sm"
                          value={tier2Hours}
                          onChange={(e) => setTier2Hours(e.target.value)}
                        />
                      </label>
                      <p className="sm:col-span-2 text-[11px] text-zinc-500">
                        Example: 24 / 24 → T1 now, T1+T2 after 24h, all three after 48h.
                      </p>
                    </div>
                  )}
                </div>
              )}
              {isRush && (
                <p className="text-[11px] text-amber-800">
                  Rush selected — selected tiers all see this load immediately (no staging).
                </p>
              )}
            </div>
          )}
          {carrierPicklist.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold text-zinc-600">Exclude from this load only (optional)</p>
              <div className="mt-2 max-h-40 overflow-y-auto rounded border border-zinc-200 bg-zinc-50/80">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-zinc-100 text-[10px] font-semibold uppercase text-zinc-600">
                    <tr>
                      <th className="px-2 py-2">Carrier</th>
                      <th className="px-1 py-2 text-center">Off</th>
                    </tr>
                  </thead>
                  <tbody>
                    {carrierPicklist
                      .filter((c) => !blockedCarrierIds.has(c.id))
                      .map((c) => (
                        <tr key={c.id} className="border-t border-zinc-200/80">
                          <td className="px-2 py-1.5 text-sm text-zinc-800">{c.legalName}</td>
                          <td className="px-1 py-1.5 text-center">
                            <input
                              type="checkbox"
                              checked={perLoadExcluded.has(c.id)}
                              onChange={() => togglePerLoadExclude(c.id)}
                              className="h-3.5 w-3.5"
                              title="Hide this load from this carrier"
                            />
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {carrierPicklist.length === 0 && (
            <p className="mt-2 text-xs text-zinc-500">No approved carriers in directory — visibility rules optional.</p>
          )}
        </section>

        <section className="rounded border border-emerald-200 bg-white/90 p-3">
          <h4 className="text-xs font-bold uppercase tracking-wide text-emerald-900">How carriers get this load</h4>
          <p className="mt-1 text-[11px] text-zinc-500">
            {TAKE_IT_LABEL} is the rate you pay — carriers book that number. Pair it with Tiers only (above) if you
            want T1 first. {OPEN_BID_LABEL} lets carriers name a price until you accept one or the window closes.
          </p>
          <div className="mt-3">
            <RadioChoice
              label="Rate type"
              name="rate-mode"
              value={rateMode}
              onChange={(v) => setRateMode(v)}
              options={[
                {
                  value: "TAKE_IT",
                  label: TAKE_IT_LABEL,
                  description: "Book this number instantly",
                },
                {
                  value: "OPEN_BID",
                  label: OPEN_BID_LABEL,
                  description: "Carriers bid",
                },
              ]}
            />
          </div>

          {rateMode === "TAKE_IT" && carrierVisibilityMode === "OPEN" && (
            <p className="mt-2 text-[11px] text-zinc-500">
              Your regular carriers can get first look — set Carrier visibility to Tiers only above, then stage T1
              before T2/T3.
            </p>
          )}

          {rateMode === "TAKE_IT" && (
            <label className="mt-3 flex items-start gap-2 text-sm text-zinc-800">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4"
                checked={allowCounterOffers}
                onChange={(e) => setAllowCounterOffers(e.target.checked)}
              />
              <span>
                <span className="font-medium">Allow counters</span>
                <span className="mt-0.5 block text-xs text-zinc-500">
                  Carriers can still book the {TAKE_IT_LABEL} instantly, or propose a different number for you to
                  accept or decline.
                </span>
              </span>
            </label>
          )}

          {rateMode === "OPEN_BID" && (
            <div className="mt-3 space-y-2">
              <p className="text-xs font-medium text-zinc-700">Bid window</p>
              <div className="flex flex-wrap gap-2">
                {BID_WINDOW_PRESETS_HOURS.map((h) => (
                  <button
                    key={h}
                    type="button"
                    disabled={bidUntilPickup}
                    onClick={() => {
                      setBidWindowHours(String(h));
                      setCustomBidHours("");
                    }}
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${
                      !bidUntilPickup && !customBidHours && bidWindowHours === String(h)
                        ? "border-lob-navy bg-lob-navy/10 text-lob-navy"
                        : "border-stone-200 bg-white text-zinc-600"
                    }`}
                  >
                    {formatBidWindowHours(h)}
                  </button>
                ))}
                <label className="flex items-center gap-1 text-xs text-zinc-600">
                  Custom
                  <input
                    className="w-16 rounded border px-2 py-1 text-xs"
                    placeholder="hrs"
                    disabled={bidUntilPickup}
                    value={customBidHours}
                    onChange={(e) => setCustomBidHours(e.target.value)}
                  />
                </label>
              </div>
              <label className="flex items-center gap-2 text-sm text-zinc-800">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={bidUntilPickup}
                  onChange={(e) => setBidUntilPickup(e.target.checked)}
                />
                Keep bidding open until pickup
              </label>
              <p className="text-[11px] text-zinc-500">
                Bidding closes when the window ends, unless you accept a bid sooner. Carriers cannot book this load
                instantly.
              </p>
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-3">
            <input
              className="w-36 rounded border px-2 py-2 text-sm"
              placeholder={rateMode === "OPEN_BID" ? `Target (${currency}, optional)` : `Rate * (${currency})`}
              value={rateUsd}
              onChange={(e) => setRateUsd(e.target.value)}
              required={rateMode === "TAKE_IT"}
            />
            <label className="text-xs text-zinc-600">
              Currency
              <select className="ml-1 rounded border px-2 py-2 text-sm" value={currency} onChange={(e) => setCurrency(e.target.value as "USD" | "CAD")}>
                <option value="CAD">CAD</option>
                <option value="USD">USD</option>
              </select>
              <span className="mt-1 block text-[11px] font-normal text-zinc-500">
                Canada–Canada defaults to CAD. US–US defaults to USD.
              </span>
            </label>
            <LanePriceChip
              originCity={originCity}
              originState={originState}
              originZip={originZip}
              destinationCity={destinationCity}
              destinationState={destinationState}
              destinationZip={destinationZip}
              equipmentType={equipmentType}
              currency={currency}
              className="self-center"
              onBand={onRateBand}
            />
            {showFairMarketAdminCopy && (
            <p className="text-xs text-zinc-500">
              Band ±30% with enough samples, ±50% on thin lanes.
            </p>
            )}
          </div>
        </section>

        <section className="rounded border border-emerald-200 bg-white/90 p-3">
          <h4 className="text-xs font-bold uppercase tracking-wide text-emerald-900">Additional</h4>
          <textarea className="mt-2 w-full rounded border px-2 py-2 text-sm" rows={3} placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <input className="mt-2 w-full rounded border px-2 py-2 text-sm" placeholder="BOL / tender URL (upload to your storage for now)" value={tenderUrl} onChange={(e) => setTenderUrl(e.target.value)} />
        </section>

        <div className="flex flex-wrap items-center gap-2 border-t border-stone-100 pt-4">
          <button type="submit" disabled={busy} className="rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
            {busy ? "Publishing…" : "Publish to board"}
          </button>
          <LoadTemplatesPanel
            variant="save-only"
            onLoad={applyTemplate}
            getCurrentSnapshot={() => ({
              originCity,
              originState,
              originZip,
              destinationCity,
              destinationState,
              destinationZip,
              equipmentType,
              weightLbs,
              isRush,
              isPrivate: false,
              rateUsd,
              currency,
              notes,
              lumber,
            })}
          />
          <button type="button" className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
