"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import { bidKindLabel } from "@/lib/rate-mode";

export type OpenBidRow = {
  id: string;
  kind: "BID" | "COUNTER";
  amountUsd: number;
  currency: "USD" | "CAD";
  note: string | null;
  expiresAt: string;
  createdAt: string;
  carrierName: string;
};

export function ShipperBidReviewList({ bids }: { bids: OpenBidRow[] }) {
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
    router.refresh();
  }

  if (bids.length === 0) {
    return <p className="text-sm text-zinc-500">No pending bids yet.</p>;
  }

  return (
    <div className="space-y-3">
      {message ? <p className="text-sm text-red-700">{message}</p> : null}
      <ul className="divide-y divide-stone-100 rounded-lg border border-stone-200 bg-white">
        {bids.map((b) => (
          <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-3">
            <div>
              <p className="text-sm font-semibold text-zinc-900">
                {formatMoney(b.amountUsd, b.currency)}{" "}
                <span className="text-[11px] font-medium uppercase text-zinc-500">{bidKindLabel(b.kind)}</span>
              </p>
              <p className="text-xs text-zinc-600">
                {b.carrierName} · expires {new Date(b.expiresAt).toLocaleString()}
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
        ))}
      </ul>
    </div>
  );
}
