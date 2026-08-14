"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CancelLoadButton({
  loadId,
  referenceNumber,
  status,
}: {
  loadId: string;
  referenceNumber: string;
  status: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const canCancel = status === "POSTED" || status === "BOOKED" || status === "ASSIGNED";

  if (!canCancel) {
    return null;
  }

  async function cancel() {
    const ok = window.confirm(
      `Cancel ${referenceNumber}? Carriers will no longer see or book this load.`,
    );
    if (!ok) return;
    setBusy(true);
    setErr(null);
    const res = await fetch(`/api/loads/${loadId}/cancel`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setErr(typeof data.error === "string" ? data.error : "Could not cancel load.");
      return;
    }
    router.refresh();
    router.push("/");
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        disabled={busy}
        onClick={() => void cancel()}
        className="rounded-lg border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-900 hover:bg-rose-100 disabled:opacity-50"
      >
        {busy ? "Cancelling…" : "Cancel load"}
      </button>
      {err && <p className="text-xs text-rose-700">{err}</p>}
    </div>
  );
}
