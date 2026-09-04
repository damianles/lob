"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import { bidKindLabel, formatTimeRemaining } from "@/lib/rate-mode";

export type OpenBidRow = {
  id: string;
  kind: "BID" | "COUNTER";
  amountUsd: number;
  currency: "USD" | "CAD";
  note: string | null;
  expiresAt: string;
  createdAt: string;
  carrierName: string;
  carrierCompanyId: string;
  priorMovesWithYou: number;
};

export function ShipperBidReviewList({
  loadId,
  bids,
  postedRate,
  marketAvg,
  miles,
}: {
  loadId: string;
  bids: OpenBidRow[];
  postedRate: number | null;
  marketAvg: number | null;
  miles: number | null;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function review(bidId: string, decision: "ACCEPT" | "DECLINE") {
    setBusyId(bidId);
    setMessage(null);
    const res = await fetch(`/api/bids/${bidId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision }),
    });
    const data = await res.json().catch(() => ({}));
    setBusyId(null);
    if (!res.ok) {
      setMessage(typeof data.error === "string" ? data.error : "Could not update bid.");
      return;
    }
    if (decision === "ACCEPT") {
      router.push(`/loads/${loadId}/rate-con`);
      return;
    }
    router.refresh();
  }

  if (bids.length === 0) {
    return <p className="text-sm text-zinc-500">No pending bids yet.</p>;
  }

  const sorted = [...bids].sort((a, b) => a.amountUsd - b.amountUsd);
  const lowest = sorted[0]?.id;

  return (
    <div className="space-y-3">
      {message ? <p className="text-sm text-red-700">{message}</p> : null}
      <ul className="divide-y divide-stone-100 rounded-lg border border-stone-200 bg-white">
        {sorted.map((b) => {
          const vsPosted =
            postedRate != null && postedRate > 0 ? b.amountUsd - postedRate : null;
          const vsAvg = marketAvg != null && marketAvg > 0 ? b.amountUsd - marketAvg : null;
          const perMile =
            miles != null && miles > 0 ? b.amountUsd / miles : null;
          return (
            <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-3">
              <div>
                <p className="text-sm font-semibold text-zinc-900">
                  {formatMoney(b.amountUsd, b.currency)}{" "}
                  <span className="text-[11px] font-medium uppercase text-zinc-500">{bidKindLabel(b.kind)}</span>
                  {b.id === lowest ? (
                    <span className="ml-1 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-emerald-800">
                      Lowest
                    </span>
                  ) : null}
                </p>
                <p className="text-xs text-zinc-600">
                  {b.carrierName}
                  {b.priorMovesWithYou > 0 ? ` · ${b.priorMovesWithYou} prior move${b.priorMovesWithYou === 1 ? "" : "s"} with you` : ""}
                </p>
                <p className="mt-0.5 text-xs font-medium text-amber-900">
                  {formatTimeRemaining(b.expiresAt)
                    ? `You have ${formatTimeRemaining(b.expiresAt)} to accept (24h from bid)`
                    : `Accept by ${new Date(b.expiresAt).toLocaleString()}`}
                </p>
                <p className="mt-0.5 text-[11px] tabular-nums text-zinc-500">
                  {vsPosted != null
                    ? `vs posted ${vsPosted >= 0 ? "+" : ""}${formatMoney(vsPosted, b.currency)}`
                    : "vs posted —"}
                  {vsAvg != null
                    ? ` · vs avg ${vsAvg >= 0 ? "+" : ""}${formatMoney(vsAvg, b.currency)}`
                    : ""}
                  {perMile != null ? ` · ${formatMoney(perMile, b.currency)}/mi` : ""}
                </p>
                {b.note ? <p className="mt-1 text-xs text-zinc-500">{b.note}</p> : null}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={busyId != null}
                  isLoading={busyId === b.id}
                  onClick={() => void review(b.id, "ACCEPT")}
                >
                  Accept
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busyId != null}
                  onClick={() => void review(b.id, "DECLINE")}
                >
                  Decline
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
