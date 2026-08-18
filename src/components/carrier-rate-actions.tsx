"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import { OPEN_BID_LABEL, TAKE_IT_LABEL } from "@/lib/rate-mode";

export function CarrierRateActions({
  loadId,
  offerCurrency,
  offeredRateUsd,
  rateMode,
  allowCounterOffers,
  bidWindowExpiresAt,
  myPendingAmount,
}: {
  loadId: string;
  offerCurrency: "USD" | "CAD";
  offeredRateUsd: number | null;
  rateMode: "TAKE_IT" | "OPEN_BID";
  allowCounterOffers: boolean;
  bidWindowExpiresAt: string | null;
  myPendingAmount?: number | null;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState<"book" | "bid" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const windowClosed = bidWindowExpiresAt ? new Date(bidWindowExpiresAt) <= new Date() : false;

  async function bookTakeIt() {
    setBusy("book");
    setMessage(null);
    const res = await fetch(`/api/loads/${loadId}/book`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agreedCurrency: offerCurrency }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      setMessage(typeof data.error === "string" ? data.error : "Could not book.");
      return;
    }
    router.refresh();
    setMessage("Booked at the Take-it rate. Open Shipments to dispatch.");
  }

  async function submitBid() {
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) {
      setMessage("Enter a bid amount.");
      return;
    }
    setBusy("bid");
    setMessage(null);
    const res = await fetch(`/api/loads/${loadId}/bids`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountUsd: n }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      setMessage(typeof data.error === "string" ? data.error : "Could not submit.");
      return;
    }
    router.refresh();
    setMessage(rateMode === "OPEN_BID" ? "Bid submitted." : "Counter sent to the mill.");
  }

  if (rateMode === "OPEN_BID") {
    return (
      <div className="space-y-2">
        <p className="text-[11px] text-zinc-600">
          {OPEN_BID_LABEL}
          {windowClosed ? " — window closed" : ""}
          {myPendingAmount != null ? ` · your bid ${formatMoney(myPendingAmount, offerCurrency)}` : ""}
        </p>
        {!windowClosed && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-zinc-500">{offerCurrency}</span>
            <input
              className="w-20 rounded border border-stone-300 px-2 py-1 text-xs"
              placeholder="Bid"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <Button type="button" size="sm" disabled={busy != null} isLoading={busy === "bid"} onClick={() => void submitBid()}>
              {myPendingAmount != null ? "Update bid" : "Submit bid"}
            </Button>
          </div>
        )}
        {message ? <p className="text-[11px] text-zinc-700">{message}</p> : null}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-zinc-600">
        {TAKE_IT_LABEL}
        {offeredRateUsd != null ? ` ${formatMoney(offeredRateUsd, offerCurrency)}` : ""}
        {allowCounterOffers ? " · counters allowed" : " · no negotiations"}
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        <Button type="button" size="sm" disabled={busy != null} isLoading={busy === "book"} onClick={() => void bookTakeIt()}>
          Book {TAKE_IT_LABEL}
        </Button>
      </div>
      {allowCounterOffers && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-zinc-500">{offerCurrency}</span>
          <input
            className="w-20 rounded border border-stone-300 px-2 py-1 text-xs"
            placeholder="Counter"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy != null}
            isLoading={busy === "bid"}
            onClick={() => void submitBid()}
          >
            {myPendingAmount != null ? "Update counter" : "Counter"}
          </Button>
        </div>
      )}
      {message ? <p className="text-[11px] text-zinc-700">{message}</p> : null}
    </div>
  );
}
