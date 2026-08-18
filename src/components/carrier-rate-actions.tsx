"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { LaneDecisionStats } from "@/components/lane-decision-stats";
import { Button } from "@/components/ui/button";
import { fetchLaneDecisionContext } from "@/lib/fetch-lane-decision";
import type { LaneDecisionContext } from "@/lib/lane-decision-types";
import { formatMoney } from "@/lib/money";
import { OPEN_BID_LABEL, TAKE_IT_LABEL } from "@/lib/rate-mode";
import { bandSide } from "@/lib/lane-decision-types";

export function CarrierRateActions({
  loadId,
  offerCurrency,
  offeredRateUsd,
  rateMode,
  allowCounterOffers,
  bidWindowExpiresAt,
  myPendingAmount,
  decision,
}: {
  loadId: string;
  offerCurrency: "USD" | "CAD";
  offeredRateUsd: number | null;
  rateMode: "TAKE_IT" | "OPEN_BID";
  allowCounterOffers: boolean;
  bidWindowExpiresAt: string | null;
  myPendingAmount?: number | null;
  decision?: LaneDecisionContext | null;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<"book" | "bid" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [fetched, setFetched] = useState<LaneDecisionContext | null>(null);

  const ctx = decision === undefined ? fetched : decision;

  useEffect(() => {
    if (decision !== undefined) return;
    let cancelled = false;
    void fetchLaneDecisionContext(loadId).then((row) => {
      if (!cancelled) setFetched(row);
    });
    return () => {
      cancelled = true;
    };
  }, [loadId, decision]);

  useEffect(() => {
    if (amount !== "") return;
    if (myPendingAmount != null) {
      setAmount(String(Math.round(myPendingAmount)));
      return;
    }
    const hint = ctx?.lastBookedRate ?? ctx?.marketAvg;
    if (hint != null && Number.isFinite(hint)) setAmount(String(Math.round(hint)));
  }, [amount, myPendingAmount, ctx?.lastBookedRate, ctx?.marketAvg]);

  const windowClosed = bidWindowExpiresAt ? new Date(bidWindowExpiresAt) <= new Date() : false;
  const bandHint =
    ctx?.bandEnforced && ctx.floor != null && ctx.ceiling != null
      ? `${formatMoney(ctx.floor, offerCurrency)}–${formatMoney(ctx.ceiling, offerCurrency)}`
      : null;

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
    router.push(`/loads/${loadId}/rate-con`);
  }

  async function submitBid() {
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) {
      setMessage("Enter a bid amount.");
      return;
    }
    if (ctx?.bandEnforced && ctx.floor != null && ctx.ceiling != null) {
      const side = bandSide(n, { bandEnforced: true, floor: ctx.floor, ceiling: ctx.ceiling });
      if (side === "low") {
        setMessage(`Too low for this lane — must be at least ${formatMoney(ctx.floor, offerCurrency)}.`);
        return;
      }
      if (side === "high") {
        setMessage(`Too high for this lane — must be at most ${formatMoney(ctx.ceiling, offerCurrency)}.`);
        return;
      }
    }
    setBusy("bid");
    setMessage(null);
    const res = await fetch(`/api/loads/${loadId}/bids`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountUsd: n, note: note.trim() || undefined }),
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

  const stats = ctx ? <LaneDecisionStats ctx={ctx} compact /> : null;
  const showBidForm = rateMode === "OPEN_BID" ? !windowClosed : allowCounterOffers;
  const noteField = showBidForm ? (
    <input
      className="w-full max-w-xs rounded border border-stone-300 px-2 py-1 text-xs"
      placeholder="Note for the mill (optional)"
      value={note}
      onChange={(e) => setNote(e.target.value)}
      maxLength={500}
    />
  ) : null;

  if (rateMode === "OPEN_BID") {
    return (
      <div className="space-y-2">
        {stats}
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
        {noteField}
        {bandHint ? <p className="text-[11px] text-zinc-500">Must be between {bandHint} on this lane.</p> : null}
        {message ? <p className="text-[11px] text-zinc-700">{message}</p> : null}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {stats}
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
      {noteField}
      {allowCounterOffers && bandHint ? (
        <p className="text-[11px] text-zinc-500">Counters must be between {bandHint}.</p>
      ) : null}
      {message ? <p className="text-[11px] text-zinc-700">{message}</p> : null}
    </div>
  );
}
