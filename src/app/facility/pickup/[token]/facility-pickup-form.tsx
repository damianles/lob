"use client";

import { useState } from "react";

export function FacilityPickupForm({ token, referenceNumber }: { token: string; referenceNumber: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setBusy(true);
    const res = await fetch(`/api/dispatch-links/${token}/pickup`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
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
      <p className="text-sm leading-relaxed break-words text-zinc-700">
        Load <span className="font-semibold text-zinc-900">{referenceNumber}</span>. Confirm once freight is on the
        truck.
      </p>
      <button
        type="submit"
        disabled={ok || busy}
        className="w-full rounded-md bg-lob-navy py-2.5 text-sm font-semibold text-white hover:bg-lob-navy-hover disabled:opacity-60"
      >
        {ok ? "Confirmed" : busy ? "Confirming…" : "Confirm pickup"}
      </button>
      {message && (
        <p className={`text-sm ${ok ? "text-emerald-800" : "text-red-700"}`} role="status">
          {message}
        </p>
      )}
    </form>
  );
}
