"use client";

import { useState } from "react";

import { LUMBER_EQUIPMENT } from "@/lib/lumber-equipment";

type Props = {
  initialTruckCount: number | null;
  initialTrailerCount: number | null;
  initialEquipmentCodes: string[];
  initialBlurb: string | null;
  initialOwnerOp: boolean;
  factoringEligible: boolean;
};

export function CarrierProfileForm({
  initialTruckCount,
  initialTrailerCount,
  initialEquipmentCodes,
  initialBlurb,
  initialOwnerOp,
  factoringEligible,
}: Props) {
  const [fleetTruckCount, setFleetTruckCount] = useState(initialTruckCount?.toString() ?? "");
  const [fleetTrailerCount, setFleetTrailerCount] = useState(initialTrailerCount?.toString() ?? "");
  const [selectedEq, setSelectedEq] = useState<string[]>(initialEquipmentCodes);
  const [blurb, setBlurb] = useState(initialBlurb ?? "");
  const [isOwnerOperator, setIsOwnerOperator] = useState(initialOwnerOp);
  const [message, setMessage] = useState<string | null>(null);

  function toggleEq(code: string) {
    setSelectedEq((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));
  }

  async function save() {
    setMessage(null);
    const trucks = fleetTruckCount === "" ? null : parseInt(fleetTruckCount, 10);
    const trailers = fleetTrailerCount === "" ? null : parseInt(fleetTrailerCount, 10);
    if (trucks != null && (Number.isNaN(trucks) || trucks < 0)) {
      setMessage("Truck count must be a non-negative number.");
      return;
    }
    if (trailers != null && (Number.isNaN(trailers) || trailers < 0)) {
      setMessage("Trailer count must be a non-negative number.");
      return;
    }

    const res = await fetch("/api/carriers/me/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fleetTruckCount: trucks,
        fleetTrailerCount: trailers,
        trailerEquipmentTypes: selectedEq,
        carrierProfileBlurb: blurb.trim() || null,
        isOwnerOperator,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error ? JSON.stringify(data.error) : "Save failed.");
      return;
    }
    setMessage("Profile updated. Shippers see this summary after they book a load with you.");
  }

  return (
    <section className="mt-8 rounded-lg border bg-white p-4">
      <h2 className="text-lg font-semibold">Fleet & capabilities</h2>
      <p className="mt-2 text-sm text-zinc-600">
        After a load is booked, mills can review your DOT/MC, insurance filings below, and this fleet snapshot so they
        know who is coming to the gate.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-xs font-semibold text-zinc-500">Power units (trucks)</label>
          <input
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
            inputMode="numeric"
            value={fleetTruckCount}
            onChange={(e) => setFleetTruckCount(e.target.value)}
            placeholder="e.g. 12"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-zinc-500">Trailers</label>
          <input
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
            inputMode="numeric"
            value={fleetTrailerCount}
            onChange={(e) => setFleetTrailerCount(e.target.value)}
            placeholder="e.g. 18"
          />
        </div>
      </div>

      <div className="mt-4">
        <p className="text-xs font-semibold text-zinc-500">Trailer / equipment types</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {LUMBER_EQUIPMENT.map((eq) => {
            const on = selectedEq.includes(eq.code);
            return (
              <button
                key={eq.code}
                type="button"
                onClick={() => toggleEq(eq.code)}
                className={
                  on
                    ? "rounded-full border border-lob-navy bg-lob-navy px-3 py-1 text-xs font-medium text-white"
                    : "rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-medium text-zinc-700"
                }
              >
                {eq.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4">
        <label className="text-xs font-semibold text-zinc-500">About your operation (shippers see this)</label>
        <textarea
          className="mt-1 w-full rounded border px-3 py-2 text-sm"
          rows={4}
          value={blurb}
          onChange={(e) => setBlurb(e.target.value)}
          placeholder="Service area, commodities, safety certs, team experience…"
        />
      </div>

      <label className="mt-4 flex cursor-pointer items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={isOwnerOperator}
          onChange={(e) => setIsOwnerOperator(e.target.checked)}
          className="mt-1"
        />
        <span>
          <span className="font-medium">Owner-operator / single-truck</span>
          <span className="mt-0.5 block text-xs text-zinc-500">
            We flag your company for admin review. Once approved, you book loads like any other carrier.
          </span>
        </span>
      </label>

      {factoringEligible && (
        <p className="mt-4 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
          <strong>Freight factoring:</strong> your account is marked factoring-eligible. Talk to your LOB admin about
          quick-pay options—especially helpful for owner-operators who need cash flow right after delivery.
        </p>
      )}

      <button
        type="button"
        onClick={() => void save()}
        className="mt-4 rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
      >
        Save carrier profile
      </button>
      {message && <p className="mt-3 text-sm text-zinc-700">{message}</p>}
    </section>
  );
}
