"use client";

import { useState } from "react";

export function FacilityDeliveryForm({ token, referenceNumber }: { token: string; referenceNumber: string }) {
  const [fileUrl, setFileUrl] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const body =
      fileUrl.trim().length > 0
        ? { fileUrl: fileUrl.trim() }
        : { receiverAcknowledged: true as const };

    const res = await fetch(`/api/dispatch-links/${token}/pod`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(typeof data.error === "string" ? data.error : "Could not complete delivery.");
      return;
    }
    setOk(true);
    setMessage("Delivery recorded. Thank you.");
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-zinc-700">
        Load <span className="font-semibold">{referenceNumber}</span>. Confirm that the shipment has been received. You
        may paste a link to a POD photo or PDF, or confirm without a file.
      </p>
      <div>
        <label className="block text-xs font-semibold text-zinc-500">POD file URL (optional)</label>
        <input
          className="mt-1 w-full rounded border px-3 py-2 text-sm"
          value={fileUrl}
          onChange={(e) => setFileUrl(e.target.value)}
          placeholder="https://…"
        />
      </div>
      <button
        type="submit"
        disabled={ok}
        className="w-full rounded-md bg-amber-700 py-2.5 text-sm font-semibold text-white hover:bg-amber-800 disabled:opacity-60"
      >
        {ok ? "Recorded" : "Confirm delivery"}
      </button>
      {message && (
        <p className={`text-sm ${ok ? "text-emerald-800" : "text-red-700"}`} role="status">
          {message}
        </p>
      )}
    </form>
  );
}
