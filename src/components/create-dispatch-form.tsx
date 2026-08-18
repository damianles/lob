"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export function CreateDispatchForm({ loadId }: { loadId: string }) {
  const router = useRouter();
  const [driverName, setDriverName] = useState("");
  const [hours, setHours] = useState("48");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!driverName.trim()) {
      setError("Driver name is required.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/loads/${loadId}/dispatch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        driverName: driverName.trim(),
        expiresInHours: Number(hours) || 48,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Could not create driver link.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="mt-6 max-w-md space-y-2 rounded-lg border border-violet-200 bg-violet-50/70 p-4">
      <h2 className="text-sm font-semibold text-zinc-900">Create driver link</h2>
      <p className="text-xs text-zinc-600">
        Assign a driver for haul details. Pickup and delivery confirmation stay with yards and receivers.
      </p>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <input
        className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
        placeholder="Driver name"
        value={driverName}
        onChange={(e) => setDriverName(e.target.value)}
      />
      <div className="flex flex-wrap items-center gap-2">
        <input
          className="w-24 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
          placeholder="Hrs"
          value={hours}
          onChange={(e) => setHours(e.target.value)}
        />
        <Button type="button" size="sm" disabled={busy} isLoading={busy} onClick={() => void submit()}>
          Create driver link
        </Button>
      </div>
    </div>
  );
}
