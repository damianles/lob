"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export function FacilityPickupForm({ token, referenceNumber }: { token: string; referenceNumber: string }) {
  const sp = useSearchParams();
  const [pickupCode, setPickupCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [scannedHint, setScannedHint] = useState(false);

  useEffect(() => {
    const c = sp.get("code");
    if (c && c.trim()) {
      setPickupCode(c.toUpperCase().replace(/\s/g, "").slice(0, 16));
      setScannedHint(true);
    }
  }, [sp]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const res = await fetch(`/api/dispatch-links/${token}/pickup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pickupCode: pickupCode.trim() }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(typeof data.error === "string" ? data.error : "Could not confirm pickup.");
      return;
    }
    setOk(true);
    setMessage("Pickup confirmed. The load is now marked in transit.");
  }

  return (
    <form
      onSubmit={submit}
      className="mt-6 max-w-full space-y-4 overflow-x-hidden rounded-2xl border border-stone-200/90 bg-white p-4 sm:p-5 shadow-sm"
    >
      <p className="text-sm text-zinc-700 leading-relaxed break-words">
        Load <span className="font-semibold text-zinc-900">{referenceNumber}</span>
        {scannedHint
          ? ". Code was filled in from the QR. Confirm once freight is on the truck."
          : ". Enter the verification code on your BOL, then confirm pickup."}
      </p>
      <div>
        <label className="block text-xs font-semibold text-zinc-500">Pickup code</label>
        <input
          className="mt-1 w-full min-w-0 max-w-full rounded-lg border border-stone-200 px-3 py-2.5 text-sm font-mono tracking-wide uppercase"
          value={pickupCode}
          onChange={(e) => setPickupCode(e.target.value.toUpperCase())}
          placeholder="e.g. AX74Q1"
          autoComplete="off"
          inputMode="text"
        />
      </div>
      <button
        type="submit"
        disabled={ok}
        className="w-full rounded-md bg-lob-navy py-2.5 text-sm font-semibold text-white hover:bg-lob-navy-hover disabled:opacity-60"
      >
        {ok ? "Confirmed" : "Confirm pickup"}
      </button>
      {message && (
        <p className={`text-sm ${ok ? "text-emerald-800" : "text-red-700"}`} role="status">
          {message}
        </p>
      )}
    </form>
  );
}
