"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { CapacityScoreChips } from "@/components/capacity-score-chips";
import { formatDisplayDate } from "@/lib/format-display-date";
import { formatMoney } from "@/lib/money";
import type { CapacityScorecardPublic } from "@/lib/capacity-scorecard-shared";

type MatchableLoad = {
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

export type CapacitySpawnPrefill = {
  originZip: string;
  originCity: string | null;
  originState: string | null;
  destinationZip: string;
  destinationCity: string | null;
  destinationState: string | null;
  equipmentType: string;
  askingRateUsd: number;
  availableFrom: string;
  availableUntil: string;
};

function ymdFromIso(iso: string) {
  return iso.slice(0, 10);
}

export function RequestCapacityModal({
  capacityId,
  capacityLabel,
  askingLabel,
  prefill,
  scorecard,
  open,
  onClose,
  onSent,
}: {
  capacityId: string;
  capacityLabel: string;
  askingLabel: string;
  prefill: CapacitySpawnPrefill;
  scorecard?: CapacityScorecardPublic | null;
  open: boolean;
  onClose: () => void;
  onSent: (info?: { spawned?: boolean; referenceNumber?: string | null }) => void;
}) {
  const [mode, setMode] = useState<"existing" | "spawn">("existing");
  const [loads, setLoads] = useState<MatchableLoad[]>([]);
  const [loading, setLoading] = useState(false);
  const [picked, setPicked] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [weightLbs, setWeightLbs] = useState("45000");
  const [pickupAt, setPickupAt] = useState(ymdFromIso(prefill.availableFrom));
  const [deliveryAt, setDeliveryAt] = useState("");
  const [rate, setRate] = useState(String(prefill.askingRateUsd));
  const [originCity, setOriginCity] = useState(prefill.originCity ?? "");
  const [originState, setOriginState] = useState(prefill.originState ?? "");
  const [destinationCity, setDestinationCity] = useState(prefill.destinationCity ?? "");
  const [destinationState, setDestinationState] = useState(prefill.destinationState ?? "");

  const needsOriginPlace = !(prefill.originCity?.trim() && prefill.originState?.trim());
  const needsDestPlace = !(prefill.destinationCity?.trim() && prefill.destinationState?.trim());

  useEffect(() => {
    if (!open) return;
    setErr(null);
    setPicked("");
    setNote("");
    setWeightLbs("45000");
    setPickupAt(ymdFromIso(prefill.availableFrom));
    setDeliveryAt("");
    setRate(String(prefill.askingRateUsd));
    setOriginCity(prefill.originCity ?? "");
    setOriginState(prefill.originState ?? "");
    setDestinationCity(prefill.destinationCity ?? "");
    setDestinationState(prefill.destinationState ?? "");
    setLoading(true);
    void fetch("/api/capacity/matchable-loads")
      .then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (r.ok && Array.isArray(j.data)) {
          setLoads(j.data);
          setMode(j.data.length > 0 ? "existing" : "spawn");
        } else {
          setLoads([]);
          setMode("spawn");
        }
      })
      .finally(() => setLoading(false));
  }, [open, prefill]);

  if (!open) return null;

  async function submit() {
    setBusy(true);
    setErr(null);

    const body =
      mode === "existing"
        ? { loadId: picked, note: note.trim() || undefined }
        : {
            spawn: {
              weightLbs: Number(weightLbs),
              requestedPickupAt: pickupAt,
              requestedDeliveryAt: deliveryAt.trim() || undefined,
              offeredRateUsd: Number(rate),
              ...(needsOriginPlace || originCity.trim()
                ? { originCity: originCity.trim(), originState: originState.trim().toUpperCase() }
                : {}),
              ...(needsDestPlace || destinationCity.trim()
                ? {
                    destinationCity: destinationCity.trim(),
                    destinationState: destinationState.trim().toUpperCase(),
                  }
                : {}),
            },
            note: note.trim() || undefined,
          };

    if (mode === "existing" && !picked) {
      setBusy(false);
      setErr("Select one of your posted loads.");
      return;
    }

    const res = await fetch(`/api/capacity/${capacityId}/interest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      const msg =
        typeof j.error === "string"
          ? j.error
          : typeof j.error?.formErrors?.[0] === "string"
            ? j.error.formErrors[0]
            : "Could not send request.";
      setErr(msg);
      return;
    }
    onSent({
      spawned: Boolean(j.data?.spawned),
      referenceNumber: j.data?.referenceNumber ?? null,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-xl border border-stone-200 bg-white p-5 shadow-xl"
      >
        <h3 className="text-lg font-semibold text-zinc-900">Request this capacity</h3>
        <p className="mt-1 text-sm text-zinc-600">
          Attach a posted load, or create a Firm Rate load from this lane. The carrier stays anonymous until they
          accept.
        </p>
        <p className="mt-2 text-xs text-zinc-500">
          Capacity: {capacityLabel} · Asking {askingLabel} · Equip {prefill.equipmentType}
        </p>
        {scorecard ? <CapacityScoreChips score={scorecard} className="mt-2" /> : null}

        <div className="mt-4 flex gap-1 rounded-lg border border-stone-200 bg-stone-50 p-1">
          <button
            type="button"
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium ${
              mode === "existing" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-600"
            }`}
            onClick={() => setMode("existing")}
          >
            Existing load
          </button>
          <button
            type="button"
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium ${
              mode === "spawn" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-600"
            }`}
            onClick={() => setMode("spawn")}
          >
            Create from lane
          </button>
        </div>

        {mode === "existing" ? (
          loading ? (
            <p className="mt-4 text-sm text-zinc-500">Loading your open loads…</p>
          ) : loads.length === 0 ? (
            <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
              No open posted loads. Switch to <span className="font-medium">Create from lane</span> to spawn one and
              request this truck.
            </p>
          ) : (
            <label className="mt-4 block text-xs font-medium text-zinc-600">
              Your posted load *
              <select
                className="mt-1 w-full rounded border border-stone-300 px-3 py-2 text-sm"
                value={picked}
                onChange={(e) => setPicked(e.target.value)}
              >
                <option value="">Select a load…</option>
                {loads.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.referenceNumber} · {l.originCity}, {l.originState} → {l.destinationCity}, {l.destinationState} ·{" "}
                    {formatDisplayDate(l.requestedPickupAt)}
                    {l.offeredRateUsd != null ? ` · ${formatMoney(l.offeredRateUsd, l.offerCurrency)}` : ""}
                  </option>
                ))}
              </select>
            </label>
          )
        ) : (
          <div className="mt-4 space-y-3">
            <p className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-zinc-600">
              Creates a private Firm Rate load from this capacity window (
              {ymdFromIso(prefill.availableFrom)} – {ymdFromIso(prefill.availableUntil)}). If the carrier declines, you
              can open it on the board later.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs font-medium text-zinc-600">
                Weight (lbs) *
                <input
                  type="number"
                  min={1}
                  className="mt-1 w-full rounded border border-stone-300 px-3 py-2 text-sm"
                  value={weightLbs}
                  onChange={(e) => setWeightLbs(e.target.value)}
                />
              </label>
              <label className="block text-xs font-medium text-zinc-600">
                Rate *
                <input
                  type="number"
                  min={1}
                  step="0.01"
                  className="mt-1 w-full rounded border border-stone-300 px-3 py-2 text-sm"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                />
              </label>
              <label className="block text-xs font-medium text-zinc-600">
                Pickup date *
                <input
                  type="date"
                  min={ymdFromIso(prefill.availableFrom)}
                  max={ymdFromIso(prefill.availableUntil)}
                  className="mt-1 w-full rounded border border-stone-300 px-3 py-2 text-sm"
                  value={pickupAt}
                  onChange={(e) => setPickupAt(e.target.value)}
                />
              </label>
              <label className="block text-xs font-medium text-zinc-600">
                Delivery date
                <input
                  type="date"
                  className="mt-1 w-full rounded border border-stone-300 px-3 py-2 text-sm"
                  value={deliveryAt}
                  onChange={(e) => setDeliveryAt(e.target.value)}
                />
              </label>
            </div>
            {(needsOriginPlace || needsDestPlace) && (
              <div className="grid grid-cols-2 gap-3">
                {needsOriginPlace ? (
                  <>
                    <label className="block text-xs font-medium text-zinc-600">
                      Origin city *
                      <input
                        className="mt-1 w-full rounded border border-stone-300 px-3 py-2 text-sm"
                        value={originCity}
                        onChange={(e) => setOriginCity(e.target.value)}
                      />
                    </label>
                    <label className="block text-xs font-medium text-zinc-600">
                      Origin state *
                      <input
                        maxLength={2}
                        className="mt-1 w-full rounded border border-stone-300 px-3 py-2 text-sm uppercase"
                        value={originState}
                        onChange={(e) => setOriginState(e.target.value)}
                      />
                    </label>
                  </>
                ) : null}
                {needsDestPlace ? (
                  <>
                    <label className="block text-xs font-medium text-zinc-600">
                      Destination city *
                      <input
                        className="mt-1 w-full rounded border border-stone-300 px-3 py-2 text-sm"
                        value={destinationCity}
                        onChange={(e) => setDestinationCity(e.target.value)}
                      />
                    </label>
                    <label className="block text-xs font-medium text-zinc-600">
                      Destination state *
                      <input
                        maxLength={2}
                        className="mt-1 w-full rounded border border-stone-300 px-3 py-2 text-sm uppercase"
                        value={destinationState}
                        onChange={(e) => setDestinationState(e.target.value)}
                      />
                    </label>
                  </>
                ) : null}
              </div>
            )}
          </div>
        )}

        <label className="mt-3 block text-xs font-medium text-zinc-600">
          Note to carrier (optional)
          <textarea
            className="mt-1 w-full rounded border border-stone-300 px-3 py-2 text-sm"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Pickup window, mill notes…"
          />
        </label>

        {err ? <p className="mt-2 text-sm text-red-700">{err}</p> : null}

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void submit()}
            disabled={busy || (mode === "existing" && loads.length === 0)}
            isLoading={busy}
          >
            {mode === "spawn" ? "Create load & send" : "Send request"}
          </Button>
        </div>
      </div>
    </div>
  );
}
