"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { lobWoodPrimaryButtonClass } from "@/lib/lob-button-styles";
import { LUMBER_EQUIPMENT } from "@/lib/lumber-equipment";

function toDateInput(iso: string | Date | null | undefined): string {
  if (!iso) return "";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export function EditLoadForm({
  load,
}: {
  load: {
    id: string;
    referenceNumber: string;
    status: string;
    originCity: string;
    originState: string;
    originZip: string;
    destinationCity: string;
    destinationState: string;
    destinationZip: string;
    weightLbs: number;
    equipmentType: string;
    isRush: boolean;
    offerCurrency: "USD" | "CAD";
    offeredRateUsd: number | null;
    requestedPickupAt: string;
    requestedDeliveryAt: string | null;
    notes: string;
    booked: boolean;
  };
}) {
  const router = useRouter();
  const [originCity, setOriginCity] = useState(load.originCity);
  const [originState, setOriginState] = useState(load.originState);
  const [originZip, setOriginZip] = useState(load.originZip);
  const [destinationCity, setDestinationCity] = useState(load.destinationCity);
  const [destinationState, setDestinationState] = useState(load.destinationState);
  const [destinationZip, setDestinationZip] = useState(load.destinationZip);
  const [weightLbs, setWeightLbs] = useState(String(load.weightLbs));
  const [equipmentType, setEquipmentType] = useState(load.equipmentType);
  const [isRush, setIsRush] = useState(load.isRush);
  const [currency, setCurrency] = useState<"USD" | "CAD">(load.offerCurrency);
  const [rate, setRate] = useState(load.offeredRateUsd != null ? String(load.offeredRateUsd) : "");
  const [pickup, setPickup] = useState(toDateInput(load.requestedPickupAt));
  const [delivery, setDelivery] = useState(toDateInput(load.requestedDeliveryAt));
  const [notes, setNotes] = useState(load.notes);
  const [changeSummary, setChangeSummary] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setMsg(null);
    const res = await fetch(`/api/loads/${load.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        originCity: originCity.trim(),
        originState: originState.trim(),
        originZip: originZip.trim(),
        destinationCity: destinationCity.trim(),
        destinationState: destinationState.trim(),
        destinationZip: destinationZip.trim(),
        weightLbs: Number(weightLbs),
        equipmentType,
        isRush,
        offerCurrency: currency,
        offeredRateUsd: Number(rate),
        requestedPickupAt: pickup,
        requestedDeliveryAt: delivery || null,
        changeSummary: changeSummary.trim() || undefined,
        extendedPosting: notes.trim()
          ? { notes: notes.trim() }
          : undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setErr(typeof data.error === "string" ? data.error : JSON.stringify(data.error ?? "Update failed"));
      return;
    }
    setMsg(typeof data.message === "string" ? data.message : "Saved.");
    router.refresh();
    router.push(`/loads/${load.id}`);
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-4">
      <p className="text-sm text-zinc-600">
        Editing <span className="font-mono font-semibold text-zinc-900">{load.referenceNumber}</span>
        <span className="text-zinc-400"> · </span>
        {load.status}
        {load.booked ? (
          <span className="ml-2 rounded bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900 ring-1 ring-amber-200">
            Booked — carrier will be notified (email queued)
          </span>
        ) : null}
      </p>

      {err && <p className="text-sm text-rose-700">{err}</p>}
      {msg && <p className="text-sm text-emerald-800">{msg}</p>}

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-xs font-medium text-zinc-600">
          Origin city
          <input className="mt-1 w-full rounded border px-2 py-2 text-sm" value={originCity} onChange={(e) => setOriginCity(e.target.value)} required />
        </label>
        <label className="text-xs font-medium text-zinc-600">
          State
          <input className="mt-1 w-full rounded border px-2 py-2 text-sm uppercase" maxLength={2} value={originState} onChange={(e) => setOriginState(e.target.value)} required />
        </label>
        <label className="text-xs font-medium text-zinc-600">
          Zip / postal
          <input className="mt-1 w-full rounded border px-2 py-2 text-sm" value={originZip} onChange={(e) => setOriginZip(e.target.value)} required />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-xs font-medium text-zinc-600">
          Destination city
          <input className="mt-1 w-full rounded border px-2 py-2 text-sm" value={destinationCity} onChange={(e) => setDestinationCity(e.target.value)} required />
        </label>
        <label className="text-xs font-medium text-zinc-600">
          State
          <input className="mt-1 w-full rounded border px-2 py-2 text-sm uppercase" maxLength={2} value={destinationState} onChange={(e) => setDestinationState(e.target.value)} required />
        </label>
        <label className="text-xs font-medium text-zinc-600">
          Zip / postal
          <input className="mt-1 w-full rounded border px-2 py-2 text-sm" value={destinationZip} onChange={(e) => setDestinationZip(e.target.value)} required />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-xs font-medium text-zinc-600">
          Pickup date
          <input type="date" className="mt-1 w-full rounded border px-2 py-2 text-sm" value={pickup} onChange={(e) => setPickup(e.target.value)} required />
        </label>
        <label className="text-xs font-medium text-zinc-600">
          Delivery date
          <input type="date" className="mt-1 w-full rounded border px-2 py-2 text-sm" value={delivery} onChange={(e) => setDelivery(e.target.value)} />
        </label>
        <label className="text-xs font-medium text-zinc-600">
          Weight (lbs)
          <input className="mt-1 w-full rounded border px-2 py-2 text-sm" value={weightLbs} onChange={(e) => setWeightLbs(e.target.value)} required />
        </label>
        <label className="text-xs font-medium text-zinc-600">
          Equipment
          <select className="mt-1 w-full rounded border px-2 py-2 text-sm" value={equipmentType} onChange={(e) => setEquipmentType(e.target.value)}>
            {LUMBER_EQUIPMENT.map((e) => (
              <option key={e.code} value={e.code}>
                {e.label} ({e.code})
              </option>
            ))}
            {!LUMBER_EQUIPMENT.some((e) => e.code === equipmentType) && (
              <option value={equipmentType}>{equipmentType}</option>
            )}
          </select>
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-xs font-medium text-zinc-600">
          Rate
          <input className="mt-1 w-full rounded border px-2 py-2 text-sm" value={rate} onChange={(e) => setRate(e.target.value)} required />
        </label>
        <label className="text-xs font-medium text-zinc-600">
          Currency
          <select className="mt-1 w-full rounded border px-2 py-2 text-sm" value={currency} onChange={(e) => setCurrency(e.target.value as "USD" | "CAD")}>
            <option value="CAD">CAD</option>
            <option value="USD">USD</option>
          </select>
        </label>
        <label className="flex items-end gap-2 pb-2 text-sm text-zinc-800">
          <input type="checkbox" checked={isRush} onChange={(e) => setIsRush(e.target.checked)} />
          Rush
        </label>
      </div>

      <label className="block text-xs font-medium text-zinc-600">
        Notes
        <textarea className="mt-1 w-full rounded border px-2 py-2 text-sm" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>

      {load.booked && (
        <label className="block text-xs font-medium text-zinc-600">
          Message to carrier (optional)
          <input
            className="mt-1 w-full rounded border px-2 py-2 text-sm"
            placeholder="Short summary of what changed"
            value={changeSummary}
            onChange={(e) => setChangeSummary(e.target.value)}
          />
        </label>
      )}

      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={busy} className={`${lobWoodPrimaryButtonClass} disabled:opacity-50`}>
          {busy ? "Saving…" : "Save changes"}
        </button>
        <button
          type="button"
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
          onClick={() => router.push(`/loads/${load.id}`)}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
