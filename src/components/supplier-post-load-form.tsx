"use client";

import { useEffect, useState } from "react";

import { LUMBER_EQUIPMENT } from "@/lib/lumber-equipment";

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

export function SupplierPostLoadForm({
  onCancel,
  onPosted,
}: {
  onCancel: () => void;
  onPosted: (msg: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [shipRef, setShipRef] = useState("");
  const [customerOrderNo, setCustomerOrderNo] = useState("");
  const [poNumber, setPoNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [urgency, setUrgency] = useState("3");
  const [requestedPickupDate, setRequestedPickupDate] = useState("");

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
  const [ftlLtl, setFtlLtl] = useState<"FTL" | "LTL">("FTL");
  const [weightLbs, setWeightLbs] = useState("");
  const [ltlPallets, setLtlPallets] = useState("");
  const [ltlPieces, setLtlPieces] = useState("");
  const [ltlLengthFt, setLtlLengthFt] = useState("");

  const [cleaning, setCleaning] = useState<"Tarp" | "Wash" | "N/A">("N/A");
  const [securement, setSecurement] = useState<"Chains" | "Straps" | "N/A" | "Other">("Straps");
  const [securementOther, setSecurementOther] = useState("");

  const [straps, setStraps] = useState(true);
  const [tarp, setTarp] = useState(false);
  const [chains, setChains] = useState(false);
  const [reqOther, setReqOther] = useState("");
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
  const [currency, setCurrency] = useState<"USD" | "CAD">("USD");
  const [isRush, setIsRush] = useState(false);
  const [notes, setNotes] = useState("");
  const [tenderUrl, setTenderUrl] = useState("");

  const [papsRequired, setPapsRequired] = useState(false);
  const [papsNumber, setPapsNumber] = useState("");
  const [parsRequired, setParsRequired] = useState(false);
  const [parsNumber, setParsNumber] = useState("");

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

  function syncPickup(idx: number, patch: Partial<PuDel>) {
    setPickups((rows) => rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  function syncDelivery(idx: number, patch: Partial<PuDel>) {
    setDeliveries((rows) => rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const w = Number(weightLbs);
    if (!Number.isFinite(w) || w <= 0) {
      setErr("Weight must be a positive number.");
      return;
    }
    if (!requestedPickupDate) {
      setErr("Requested pickup date is required.");
      return;
    }
    const r = Number(rateUsd);
    if (!Number.isFinite(r) || r <= 0) {
      setErr("Posted rate (USD) is required and must be within the fair-market band for this lane.");
      return;
    }
    if (!originCity.trim() || !originState.trim() || !originZip.trim()) {
      setErr("Origin city, state, and ZIP are required (lane search).");
      return;
    }
    if (!destinationCity.trim() || !destinationState.trim() || !destinationZip.trim()) {
      setErr("Destination city, state, and ZIP are required.");
      return;
    }
    if (!pickups[0]?.address.trim()) {
      setErr("Pickup 1 address is required.");
      return;
    }
    if (!deliveries[0]?.address.trim() || !deliveries[0]?.date) {
      setErr("Delivery 1 address and delivery date are required.");
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
      cleaning,
      securement,
      securementOther: securement === "Other" ? securementOther.trim() : undefined,
      loadRequirements: {
        straps,
        tarp,
        chains,
        other: reqOther.trim() || undefined,
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
        offeredRateUsd: r,
        extendedPosting,
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
    <div className="border-b border-emerald-200 bg-emerald-50/80 px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-emerald-900">Post a lumber load (supplier)</h3>
        <button type="button" className="text-xs text-emerald-800 underline" onClick={onCancel}>
          Close
        </button>
      </div>
      {err && <p className="mt-2 text-sm text-red-800">{err}</p>}
      <form className="mt-3 space-y-6" onSubmit={submit}>
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
          </div>
        </section>

        <section className="rounded border border-emerald-200 bg-white/90 p-3">
          <h4 className="text-xs font-bold uppercase tracking-wide text-emerald-900">Lane (search)</h4>
          <p className="mt-1 text-xs text-zinc-500">Used for the board and fair-rate check; can match pickup 1.</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
            <input className="rounded border px-2 py-2 text-sm" placeholder="Origin city *" value={originCity} onChange={(e) => setOriginCity(e.target.value)} required />
            <input className="rounded border px-2 py-2 text-sm" placeholder="ST *" maxLength={2} value={originState} onChange={(e) => setOriginState(e.target.value)} required />
            <input className="rounded border px-2 py-2 text-sm" placeholder="Origin ZIP *" value={originZip} onChange={(e) => setOriginZip(e.target.value)} required />
            <input className="rounded border px-2 py-2 text-sm" placeholder="Dest city *" value={destinationCity} onChange={(e) => setDestinationCity(e.target.value)} required />
            <input className="rounded border px-2 py-2 text-sm" placeholder="ST *" maxLength={2} value={destinationState} onChange={(e) => setDestinationState(e.target.value)} required />
            <input className="rounded border px-2 py-2 text-sm" placeholder="Dest ZIP *" value={destinationZip} onChange={(e) => setDestinationZip(e.target.value)} required />
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
              <input className="rounded border px-2 py-2 text-sm sm:col-span-2" placeholder="Address *" value={p.address} onChange={(e) => syncPickup(i, { address: e.target.value })} required={i === 0} />
              <input className="rounded border px-2 py-2 text-sm" placeholder="Postal" value={p.postal} onChange={(e) => syncPickup(i, { postal: e.target.value })} />
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
              <input className="rounded border px-2 py-2 text-sm sm:col-span-2" placeholder="Address *" value={d.address} onChange={(e) => syncDelivery(i, { address: e.target.value })} required={i === 0} />
              <input className="rounded border px-2 py-2 text-sm" placeholder="Postal" value={d.postal} onChange={(e) => syncDelivery(i, { postal: e.target.value })} />
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
            <input className="rounded border px-2 py-2 text-sm" placeholder="Weight lbs *" value={weightLbs} onChange={(e) => setWeightLbs(e.target.value)} required />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isRush} onChange={(e) => setIsRush(e.target.checked)} />
              Rush
            </label>
          </div>
          {ftlLtl === "LTL" && (
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              <input className="rounded border px-2 py-2 text-sm" placeholder="# Pallets" value={ltlPallets} onChange={(e) => setLtlPallets(e.target.value)} />
              <input className="rounded border px-2 py-2 text-sm" placeholder="# Pieces" value={ltlPieces} onChange={(e) => setLtlPieces(e.target.value)} />
              <input className="rounded border px-2 py-2 text-sm" placeholder="Length (ft)" value={ltlLengthFt} onChange={(e) => setLtlLengthFt(e.target.value)} />
            </div>
          )}
        </section>

        <section className="rounded border border-emerald-200 bg-white/90 p-3">
          <h4 className="text-xs font-bold uppercase tracking-wide text-emerald-900">Cleaning & securement</h4>
          <div className="mt-2 flex flex-wrap gap-4">
            <label className="text-xs text-zinc-600">
              Trailer cleaning
              <select className="ml-1 rounded border px-2 py-1 text-sm" value={cleaning} onChange={(e) => setCleaning(e.target.value as typeof cleaning)}>
                <option value="N/A">N/A</option>
                <option value="Tarp">Tarp</option>
                <option value="Wash">Wash</option>
              </select>
            </label>
            <label className="text-xs text-zinc-600">
              Primary securement
              <select className="ml-1 rounded border px-2 py-1 text-sm" value={securement} onChange={(e) => setSecurement(e.target.value as typeof securement)}>
                <option value="Straps">Straps</option>
                <option value="Chains">Chains</option>
                <option value="N/A">N/A</option>
                <option value="Other">Other</option>
              </select>
            </label>
            {securement === "Other" && (
              <input className="rounded border px-2 py-2 text-sm" placeholder="Describe other securement" value={securementOther} onChange={(e) => setSecurementOther(e.target.value)} />
            )}
          </div>
          <p className="mt-3 text-xs font-semibold text-zinc-700">Load requirements (check all that apply)</p>
          <div className="mt-1 flex flex-wrap gap-4 text-sm">
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
            <input className="min-w-[12rem] rounded border px-2 py-1 text-sm" placeholder="Other requirement" value={reqOther} onChange={(e) => setReqOther(e.target.value)} />
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <textarea className="rounded border px-2 py-2 text-sm" rows={2} placeholder="Pickup requirements / instructions" value={puRequirements} onChange={(e) => setPuRequirements(e.target.value)} />
            <textarea className="rounded border px-2 py-2 text-sm" rows={2} placeholder="Delivery requirements / instructions" value={delRequirements} onChange={(e) => setDelRequirements(e.target.value)} />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={permits} onChange={(e) => setPermits(e.target.checked)} />
              Permits required
            </label>
            {permits && <input className="min-w-[16rem] rounded border px-2 py-2 text-sm" placeholder="Permit type / notes" value={permitNote} onChange={(e) => setPermitNote(e.target.value)} />}
          </div>
        </section>

        <section className="rounded border border-emerald-200 bg-white/90 p-3">
          <h4 className="text-xs font-bold uppercase tracking-wide text-emerald-900">Services & PPE</h4>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
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
          <h4 className="text-xs font-bold uppercase tracking-wide text-emerald-900">Rate</h4>
          <div className="mt-2 flex flex-wrap gap-3">
            <input className="w-36 rounded border px-2 py-2 text-sm" placeholder="Rate * (USD)" value={rateUsd} onChange={(e) => setRateUsd(e.target.value)} required />
            <label className="text-xs text-zinc-600">
              Display currency
              <select className="ml-1 rounded border px-2 py-2 text-sm" value={currency} onChange={(e) => setCurrency(e.target.value as "USD" | "CAD")}>
                <option value="USD">USD</option>
                <option value="CAD">CAD</option>
              </select>
            </label>
            <p className="text-xs text-zinc-500">
              Fair-market check uses 60-day lane averages (±30% if ≥5 samples, ±50% if &lt;5). Benchmarks:{" "}
              <code className="rounded bg-zinc-100 px-1">data/market-benchmarks.json</code>
            </p>
          </div>
        </section>

        <section className="rounded border border-emerald-200 bg-white/90 p-3">
          <h4 className="text-xs font-bold uppercase tracking-wide text-emerald-900">Additional</h4>
          <textarea className="mt-2 w-full rounded border px-2 py-2 text-sm" rows={3} placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <input className="mt-2 w-full rounded border px-2 py-2 text-sm" placeholder="BOL / tender URL (upload to your storage for now)" value={tenderUrl} onChange={(e) => setTenderUrl(e.target.value)} />
        </section>

        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={busy} className="rounded bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {busy ? "Publishing…" : "Publish to board"}
          </button>
          <button type="button" className="rounded border border-zinc-300 px-4 py-2 text-sm" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
