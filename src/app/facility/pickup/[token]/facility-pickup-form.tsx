"use client";

import { useState } from "react";

export function FacilityPickupForm({ token, referenceNumber }: { token: string; referenceNumber: string }) {
  const [pickupCode, setPickupCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const res = await fetch(`/api/dispatch-links/${token}/pickup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pickupCode }),
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
    <form onSubmit={submit} className="mt-6 space-y-4 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-zinc-700">
        Load <span className="font-semibold">{referenceNumber}</span>. Enter the pickup verification code provided by
        the shipper or on the paperwork, then confirm.
      </p>
      <div>
        <label className="block text-xs font-semibold text-zinc-500">Pickup code</label>
        <input
          className="mt-1 w-full rounded border px-3 py-2 text-sm uppercase"
          value={pickupCode}
          onChange={(e) => setPickupCode(e.target.value)}
          placeholder="e.g. AX74Q1"
          autoComplete="off"
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
