"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export function ShipperConfirmPickup({
  loadId,
  referenceNumber,
  canConfirm,
  pickupConfirmedAt,
}: {
  loadId: string;
  referenceNumber: string;
  canConfirm: boolean;
  pickupConfirmedAt: Date | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmedAt, setConfirmedAt] = useState<Date | null>(pickupConfirmedAt);

  async function confirm() {
    setBusy(true);
    setMessage(null);
    const res = await fetch(`/api/loads/${loadId}/confirm-pickup`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMessage(typeof data.error === "string" ? data.error : "Could not confirm pickup.");
      return;
    }
    setConfirmedAt(new Date());
    setMessage("Pickup confirmed. Load is in transit.");
    router.refresh();
  }

  if (confirmedAt) {
    return (
      <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50/80 p-4">
        <p className="text-sm font-semibold text-emerald-900">Pickup confirmed at your yard</p>
        <p className="mt-1 text-xs text-emerald-800">
          {referenceNumber} · {confirmedAt.toLocaleString()}
        </p>
      </div>
    );
  }

  if (!canConfirm) {
    return null;
  }

  return (
    <div className="mt-4 rounded-lg border border-stone-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-zinc-900">Confirm pickup at your yard</h3>
      <p className="mt-1 text-xs text-zinc-600">
        Use this when the truck leaves your site. Third-party yards use the pickup link or office QR instead.
      </p>
      {message ? <p className="mt-2 text-sm text-zinc-700">{message}</p> : null}
      <Button type="button" size="sm" className="mt-3" disabled={busy} isLoading={busy} onClick={() => void confirm()}>
        Confirm pickup
      </Button>
    </div>
  );
}
