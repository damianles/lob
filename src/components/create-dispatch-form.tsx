"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DEFAULT_DRIVER_PACKET_INCLUDE,
  DRIVER_PACKET_FIELD_IDS,
  DRIVER_PACKET_FIELD_LABELS,
  type DriverPacketInclude,
} from "@/lib/driver-packet";

export function CreateDispatchForm({ loadId }: { loadId: string }) {
  const router = useRouter();
  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [hours, setHours] = useState("48");
  const [notes, setNotes] = useState("");
  const [include, setInclude] = useState<DriverPacketInclude>({ ...DEFAULT_DRIVER_PACKET_INCLUDE });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(id: keyof DriverPacketInclude) {
    if (id === "lane") return;
    setInclude((prev) => ({ ...prev, [id]: !prev[id] }));
  }

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
        driverPhone: driverPhone.trim() || undefined,
        expiresInHours: Number(hours) || 48,
        notes: notes.trim() || undefined,
        include,
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
    <div className="mt-6 max-w-lg space-y-3 rounded-lg border border-sky-200 bg-sky-50/70 p-4">
      <h2 className="text-sm font-semibold text-zinc-900">Create driver dispatch</h2>
      <p className="text-xs text-zinc-600">
        Pick what this driver should see. We generate a haul sheet you can print or save as PDF and attach in Outlook —
        no rates, ever. Pickup and delivery stay with the yard and receiver.
      </p>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <input
        className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
        placeholder="Driver name *"
        value={driverName}
        onChange={(e) => setDriverName(e.target.value)}
      />
      <input
        className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
        placeholder="Driver phone (optional)"
        value={driverPhone}
        onChange={(e) => setDriverPhone(e.target.value)}
      />
      <fieldset className="rounded-lg border border-sky-100 bg-white/80 p-3">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Include on driver sheet
        </legend>
        <ul className="mt-1 space-y-2">
          {DRIVER_PACKET_FIELD_IDS.map((id) => {
            const meta = DRIVER_PACKET_FIELD_LABELS[id];
            const locked = id === "lane";
            return (
              <li key={id}>
                <label className="flex cursor-pointer items-start gap-2 text-sm text-zinc-800">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={include[id]}
                    disabled={locked}
                    onChange={() => toggle(id)}
                  />
                  <span>
                    <span className="font-medium">{meta.label}</span>
                    <span className="mt-0.5 block text-xs text-zinc-500">{meta.hint}</span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </fieldset>
      <textarea
        className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
        rows={3}
        maxLength={800}
        placeholder="Dispatcher notes for the driver (optional) — appointment window, gate instructions, etc."
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs text-zinc-600">
          Link hours
          <input
            className="ml-2 w-20 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
            placeholder="Hrs"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
          />
        </label>
        <Button type="button" size="sm" disabled={busy} isLoading={busy} onClick={() => void submit()}>
          Create dispatch
        </Button>
      </div>
    </div>
  );
}
