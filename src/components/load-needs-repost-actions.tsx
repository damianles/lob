"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { OPEN_BID_LABEL, TAKE_IT_LABEL } from "@/lib/rate-mode";

/**
 * Accept (new dates → back on board) or Decline (unlist) for a single NEEDS_REPOST load.
 */
export function LoadNeedsRepostActions({
  loadId,
  referenceNumber,
  rateMode,
  bidCycleCount,
}: {
  loadId: string;
  referenceNumber: string;
  rateMode: "TAKE_IT" | "OPEN_BID";
  bidCycleCount: number;
}) {
  const router = useRouter();
  const [pickup, setPickup] = useState("");
  const [delivery, setDelivery] = useState("");
  const [busy, setBusy] = useState<"ACCEPT" | "DECLINE" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function resolve(decision: "ACCEPT" | "DECLINE") {
    setBusy(decision);
    setMessage(null);
    const res = await fetch(`/api/loads/${loadId}/repost-resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        decision,
        pickupAt: decision === "ACCEPT" ? pickup : undefined,
        deliveryAt: decision === "ACCEPT" ? delivery || undefined : undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      setMessage(typeof data.error === "string" ? data.error : "Could not resolve.");
      return;
    }
    setMessage(decision === "ACCEPT" ? "Load reposted to the board." : "Load unlisted.");
    router.refresh();
  }

  return (
    <section className="lob-needs-repost-panel mt-4 rounded-xl border border-amber-300 bg-amber-50/90 p-4">
      <h2 className="text-sm font-semibold text-amber-950">This load needs a repost</h2>
      <p className="mt-1 text-xs text-amber-900/85">
        {referenceNumber} is off the board until you accept with new future dates or decline (unlist). Posted rate is
        kept for analytics.
        {rateMode === "OPEN_BID" ? ` Open Bid cycle ${bidCycleCount}/2.` : null}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <label className="text-[11px] text-zinc-700">
          New pickup *
          <input
            type="date"
            className="ml-1 rounded border border-amber-200 bg-white px-2 py-1 text-sm"
            value={pickup}
            onChange={(e) => setPickup(e.target.value)}
          />
        </label>
        <label className="text-[11px] text-zinc-700">
          New delivery
          <input
            type="date"
            className="ml-1 rounded border border-amber-200 bg-white px-2 py-1 text-sm"
            value={delivery}
            onChange={(e) => setDelivery(e.target.value)}
          />
        </label>
      </div>
      {message ? <p className="mt-2 text-xs text-amber-950">{message}</p> : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={busy != null}
          isLoading={busy === "ACCEPT"}
          onClick={() => void resolve("ACCEPT")}
        >
          Accept &amp; repost
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy != null}
          isLoading={busy === "DECLINE"}
          onClick={() => void resolve("DECLINE")}
        >
          Decline (unlist)
        </Button>
      </div>
      <p className="mt-2 text-[11px] text-zinc-600">
        {rateMode === "TAKE_IT"
          ? `${TAKE_IT_LABEL}: Accept puts this load back on the board with your new dates.`
          : `${OPEN_BID_LABEL}: Accept opens another 72h bid cycle on this same load.`}
      </p>
    </section>
  );
}
