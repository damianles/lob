"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export function SupplierConfirmDelivery({
  loadId,
  referenceNumber,
  pickupConfirmedAt,
  carrierDeliveredAt,
  supplierDeliveredAt,
}: {
  loadId: string;
  referenceNumber: string;
  pickupConfirmedAt: Date | null;
  carrierDeliveredAt: Date | null;
  supplierDeliveredAt: Date | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function confirm() {
    setBusy(true);
    setMessage(null);
    const res = await fetch(`/api/loads/${loadId}/supplier-confirm-delivery`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMessage(typeof data.error === "string" ? data.error : "Could not confirm load complete.");
      return;
    }
    setMessage("Load marked complete on your side.");
    router.refresh();
  }

  if (supplierDeliveredAt) {
    return (
      <section className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50/80 p-4">
        <h2 className="text-sm font-semibold text-emerald-900">You confirmed load complete</h2>
        <p className="mt-1 text-xs text-emerald-800">
          {referenceNumber} · {supplierDeliveredAt.toLocaleString()}
          {carrierDeliveredAt ? " · Mutual close complete" : ""}
        </p>
      </section>
    );
  }

  if (!pickupConfirmedAt || !carrierDeliveredAt) {
    return (
      <section className="mt-6 rounded-lg border border-stone-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-zinc-900">Confirm load complete</h2>
        <p className="mt-1 text-xs text-zinc-600">
          Available after the carrier marks pickup, uploads the signed BOL, and marks delivered.
          {!pickupConfirmedAt
            ? " Waiting on carrier pickup."
            : !carrierDeliveredAt
              ? " Waiting on carrier delivery + BOL."
              : ""}
        </p>
      </section>
    );
  }

  return (
    <section className="mt-6 rounded-lg border border-stone-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-zinc-900">Confirm load complete</h2>
      <p className="mt-1 text-xs text-zinc-600">
        Carrier marked delivered {carrierDeliveredAt.toLocaleString()}. Confirm when the load is complete on your side.
        That unlocks the completion invoice for the carrier.
      </p>
      {message ? <p className="mt-2 text-sm text-zinc-700">{message}</p> : null}
      <Button type="button" size="sm" className="mt-3" disabled={busy} isLoading={busy} onClick={() => void confirm()}>
        Confirm load complete
      </Button>
    </section>
  );
}
