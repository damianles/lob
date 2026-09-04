"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { OPEN_BID_LABEL, TAKE_IT_LABEL, rateModeLabel } from "@/lib/rate-mode";

export type NeedsRepostRow = {
  id: string;
  referenceNumber: string;
  rateMode: "TAKE_IT" | "OPEN_BID";
  bidCycleCount: number;
  originCity: string;
  originState: string;
  destinationCity: string;
  destinationState: string;
  requestedPickupAt: string;
  requestedDeliveryAt: string | null;
  offeredRateUsd: number | null;
  offerCurrency: "USD" | "CAD";
};

/**
 * In-app queue + soft-warn modal for loads that need Accept (new dates) or Decline (unlist).
 */
export function NeedsRepostPanel({ compact = false }: { compact?: boolean }) {
  const [rows, setRows] = useState<NeedsRepostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [dates, setDates] = useState<Record<string, { pickup: string; delivery: string }>>({});

  const refresh = useCallback(() => {
    setLoading(true);
    void fetch("/api/loads/needs-repost")
      .then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (r.ok && Array.isArray(j.data)) setRows(j.data);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function resolve(id: string, decision: "ACCEPT" | "DECLINE") {
    setBusyId(id);
    setMsg(null);
    const d = dates[id] ?? { pickup: "", delivery: "" };
    const res = await fetch(`/api/loads/${id}/repost-resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        decision,
        pickupAt: decision === "ACCEPT" ? d.pickup : undefined,
        deliveryAt: decision === "ACCEPT" ? d.delivery || undefined : undefined,
      }),
    });
    const j = await res.json().catch(() => ({}));
    setBusyId(null);
    if (!res.ok) {
      setMsg(typeof j.error === "string" ? j.error : "Could not resolve.");
      return;
    }
    setMsg(decision === "ACCEPT" ? "Load reposted to the board." : "Load unlisted.");
    refresh();
  }

  if (loading && rows.length === 0) {
    return compact ? null : <p className="text-sm text-zinc-500">Checking for loads that need action…</p>;
  }
  if (rows.length === 0) return null;

  return (
    <section
      className={
        compact
          ? "rounded-lg border border-amber-300 bg-amber-50 px-3 py-2"
          : "rounded-xl border border-amber-300 bg-amber-50/90 p-4 shadow-sm"
      }
    >
      <h2 className="text-sm font-semibold text-amber-950">
        {rows.length} load{rows.length === 1 ? "" : "s"} need{rows.length === 1 ? "s" : ""} your action
      </h2>
      <p className="mt-1 text-xs text-amber-900/80">
        Firm Rate loads past 7 days after pickup, or Open bid windows that ended, stay off the board until you
        accept (new future dates) or decline (unlist). Posted prices are kept for analytics.
      </p>
      {msg ? <p className="mt-2 text-xs text-amber-950">{msg}</p> : null}
      <ul className="mt-3 space-y-3">
        {rows.map((r) => {
          const d = dates[r.id] ?? { pickup: "", delivery: "" };
          return (
            <li key={r.id} className="rounded-lg border border-amber-200 bg-white p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-semibold text-zinc-900">
                  <Link href={`/loads/${r.id}`} className="text-lob-navy underline">
                    {r.referenceNumber}
                  </Link>{" "}
                  <span className="text-xs font-medium text-zinc-500">{rateModeLabel(r.rateMode)}</span>
                  {r.rateMode === "OPEN_BID" ? (
                    <span className="ml-1 text-[11px] text-zinc-500">cycle {r.bidCycleCount}/2</span>
                  ) : null}
                </p>
                <p className="text-xs text-zinc-600">
                  {r.originCity}, {r.originState} → {r.destinationCity}, {r.destinationState}
                </p>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <label className="text-[11px] text-zinc-600">
                  New pickup *
                  <input
                    type="date"
                    className="ml-1 rounded border px-2 py-1 text-sm"
                    value={d.pickup}
                    onChange={(e) =>
                      setDates((prev) => ({
                        ...prev,
                        [r.id]: { pickup: e.target.value, delivery: d.delivery },
                      }))
                    }
                  />
                </label>
                <label className="text-[11px] text-zinc-600">
                  New delivery
                  <input
                    type="date"
                    className="ml-1 rounded border px-2 py-1 text-sm"
                    value={d.delivery}
                    onChange={(e) =>
                      setDates((prev) => ({
                        ...prev,
                        [r.id]: { pickup: d.pickup, delivery: e.target.value },
                      }))
                    }
                  />
                </label>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={busyId != null}
                  isLoading={busyId === r.id}
                  onClick={() => void resolve(r.id, "ACCEPT")}
                >
                  Accept &amp; repost
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busyId != null}
                  onClick={() => void resolve(r.id, "DECLINE")}
                >
                  Decline (unlist)
                </Button>
              </div>
              <p className="mt-1 text-[11px] text-zinc-500">
                {r.rateMode === "TAKE_IT"
                  ? `${TAKE_IT_LABEL}: choosing Accept puts this load back on the board with your new dates.`
                  : `${OPEN_BID_LABEL}: Accept opens another ${72}h bid cycle on this same load id.`}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Soft-warn dialog before publish when unresolved loads exist. Does not block publish. */
export function SoftWarnNeedsRepost({
  open,
  count,
  onContinue,
  onCancel,
}: {
  open: boolean;
  count: number;
  onContinue: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="max-w-md rounded-xl border border-amber-200 bg-white p-5 shadow-xl"
      >
        <h3 className="text-lg font-semibold text-zinc-900">Loads need your attention</h3>
        <p className="mt-2 text-sm text-zinc-600">
          You have <span className="font-semibold">{count}</span> load
          {count === 1 ? "" : "s"} past the Firm Rate 7-day window or with an ended Open bid cycle. You can still
          publish this new load — resolve those when you can so dates stay accurate.
        </p>
        <p className="mt-2 text-xs text-zinc-500">
          Resolve them under Shipments (amber banner) or after this post.
        </p>
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Go resolve first
          </Button>
          <Button type="button" onClick={onContinue}>
            Continue publishing
          </Button>
        </div>
      </div>
    </div>
  );
}
