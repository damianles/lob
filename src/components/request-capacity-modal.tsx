"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { formatDisplayDate } from "@/lib/format-display-date";
import { formatMoney } from "@/lib/money";

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

export function RequestCapacityModal({
  capacityId,
  capacityLabel,
  askingLabel,
  open,
  onClose,
  onSent,
}: {
  capacityId: string;
  capacityLabel: string;
  askingLabel: string;
  open: boolean;
  onClose: () => void;
  onSent: () => void;
}) {
  const [loads, setLoads] = useState<MatchableLoad[]>([]);
  const [loading, setLoading] = useState(false);
  const [picked, setPicked] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setErr(null);
    setPicked("");
    setNote("");
    setLoading(true);
    void fetch("/api/capacity/matchable-loads")
      .then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (r.ok && Array.isArray(j.data)) setLoads(j.data);
        else setLoads([]);
      })
      .finally(() => setLoading(false));
  }, [open]);

  if (!open) return null;

  async function submit() {
    if (!picked) {
      setErr("Select one of your posted loads.");
      return;
    }
    setBusy(true);
    setErr(null);
    const res = await fetch(`/api/capacity/${capacityId}/interest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loadId: picked, note: note.trim() || undefined }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setErr(typeof j.error === "string" ? j.error : "Could not send request.");
      return;
    }
    onSent();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <div role="dialog" aria-modal="true" className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-xl border border-stone-200 bg-white p-5 shadow-xl">
        <h3 className="text-lg font-semibold text-zinc-900">Request this capacity</h3>
        <p className="mt-1 text-sm text-zinc-600">
          Attach one of your <span className="font-medium">posted</span> loads. The carrier stays anonymous until they
          accept — then the load books and identity unlocks on the shipment.
        </p>
        <p className="mt-2 text-xs text-zinc-500">
          Capacity: {capacityLabel} · Asking {askingLabel}
        </p>

        {loading ? (
          <p className="mt-4 text-sm text-zinc-500">Loading your open loads…</p>
        ) : loads.length === 0 ? (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            You need a posted load that is still open. Post a load first, then request this truck for it.
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
          <Button type="button" onClick={() => void submit()} disabled={busy || loads.length === 0} isLoading={busy}>
            Send request
          </Button>
        </div>
      </div>
    </div>
  );
}
