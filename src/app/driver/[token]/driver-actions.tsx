"use client";

import { useState } from "react";

export function DriverActions({
  token,
  canConfirmPickup,
  canUploadPod,
}: {
  token: string;
  canConfirmPickup: boolean;
  canUploadPod: boolean;
}) {
  const [pickupCode, setPickupCode] = useState("");
  const [podUrl, setPodUrl] = useState("");
  const [message, setMessage] = useState("");

  async function confirmPickup() {
    const res = await fetch(`/api/dispatch-links/${token}/pickup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pickupCode }),
    });

    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error ? JSON.stringify(data.error) : "Pickup confirmation failed.");
      return;
    }
    setMessage("Pickup confirmed.");
  }

  async function uploadPod() {
    const res = await fetch(`/api/dispatch-links/${token}/pod`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileUrl: podUrl }),
    });

    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error ? JSON.stringify(data.error) : "POD upload failed.");
      return;
    }
    setMessage("POD uploaded. Load marked delivered.");
  }

  return (
    <section className="mt-6 rounded-lg border p-4">
      <h2 className="font-semibold">Actions</h2>

      {canConfirmPickup && (
        <div className="mt-4 space-y-2">
          <label className="block text-sm font-medium">Pickup code</label>
          <input
            className="w-full rounded border px-3 py-2 text-sm"
            placeholder="Enter unique pickup code"
            value={pickupCode}
            onChange={(e) => setPickupCode(e.target.value)}
          />
          <button
            className="rounded bg-zinc-900 px-4 py-2 text-sm text-white"
            onClick={confirmPickup}
            type="button"
          >
            Confirm pickup
          </button>
        </div>
      )}

      {canUploadPod && (
        <div className="mt-6 space-y-2">
          <label className="block text-sm font-medium">POD URL</label>
          <input
            className="w-full rounded border px-3 py-2 text-sm"
            placeholder="https://..."
            value={podUrl}
            onChange={(e) => setPodUrl(e.target.value)}
          />
          <button
            className="rounded bg-amber-600 px-4 py-2 text-sm text-white"
            onClick={uploadPod}
            type="button"
          >
            Upload POD
          </button>
        </div>
      )}

      {message && <p className="mt-4 text-sm">{message}</p>}
    </section>
  );
}

