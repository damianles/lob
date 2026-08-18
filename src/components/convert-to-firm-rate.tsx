"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { TAKE_IT_LABEL } from "@/lib/rate-mode";

export function ConvertToFirmRate({
  loadId,
  currency,
  defaultRate,
}: {
  loadId: string;
  currency: "USD" | "CAD";
  defaultRate: number | null;
}) {
  const router = useRouter();
  const [rate, setRate] = useState(defaultRate != null ? String(Math.round(defaultRate)) : "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function convert() {
    const n = Number(rate);
    if (!Number.isFinite(n) || n <= 0) {
      setMessage("Enter a Firm Rate — this is the amount you pay.");
      return;
    }
    setBusy(true);
    setMessage(null);
    const res = await fetch(`/api/loads/${loadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rateMode: "TAKE_IT",
        offeredRateUsd: n,
        allowCounterOffers: true,
        changeSummary: `Converted Open bid to ${TAKE_IT_LABEL} ${currency} ${Math.round(n)}.`,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMessage(typeof data.error === "string" ? data.error : "Could not convert.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="mt-3 rounded-lg border border-dashed border-stone-300 bg-white px-3 py-2">
      <p className="text-[11px] text-zinc-600">
        No cover yet? Post a {TAKE_IT_LABEL} so carriers can book instantly. Pending bids stay as counters.
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] text-zinc-500">{currency}</span>
        <input
          className="w-24 rounded border border-stone-300 px-2 py-1 text-xs"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          placeholder="Rate"
        />
        <Button type="button" size="sm" variant="outline" disabled={busy} isLoading={busy} onClick={() => void convert()}>
          Post as {TAKE_IT_LABEL}
        </Button>
      </div>
      {message ? <p className="mt-1 text-[11px] text-red-700">{message}</p> : null}
    </div>
  );
}
