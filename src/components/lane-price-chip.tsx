"use client";

import { useEffect, useState } from "react";

import { formatMoney } from "@/lib/money";

type Quote = {
  match: boolean;
  reason?: string;
  offerCurrency?: "USD" | "CAD";
  avgRate?: number;
  avgUsd?: number;
  sampleCount?: number | null;
  matchLevel?: "zip" | "city" | "state";
  windowDays?: number | null;
  yoyChangePct?: number | null;
  prevYearAvg?: number | null;
  prevYearAvgUsd?: number | null;
};

type Props = {
  originCity: string;
  originState: string;
  originZip: string;
  destinationCity: string;
  destinationState: string;
  destinationZip: string;
  equipmentType: string;
  /** Currency the supplier is using to type their offer; we display USD avg + a converted note when CAD. */
  currency?: "USD" | "CAD";
  className?: string;
};

function formatLaneAvg(q: Quote): string {
  const n = q.avgRate ?? q.avgUsd;
  if (n == null || !Number.isFinite(n)) return "—";
  const c = (q.offerCurrency ?? "USD") as "USD" | "CAD";
  return formatMoney(n, c);
}

function debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number) {
  let h: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (h) clearTimeout(h);
    h = setTimeout(() => fn(...args), ms);
  };
}

/**
 * Live rate-context chip for the post form.
 * Shows the rolling-window average for the lane + YoY change so the
 * supplier can price the load at the market right now.
 */
export function LanePriceChip({
  originCity,
  originState,
  originZip,
  destinationCity,
  destinationState,
  destinationZip,
  equipmentType,
  currency = "USD",
  className,
}: Props) {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const run = debounce((..._args: unknown[]) => {
      void _args;
      const ready =
        originState.trim().length >= 2 &&
        destinationState.trim().length >= 2 &&
        originZip.trim().length >= 3 &&
        destinationZip.trim().length >= 3 &&
        equipmentType.trim().length >= 1;
      if (!ready) {
        setQuote(null);
        return;
      }

      const params = new URLSearchParams({
        originCity,
        originState,
        originZip,
        destinationCity,
        destinationState,
        destinationZip,
        equipmentType,
        offerCurrency: currency,
      });

      setLoading(true);
      fetch(`/api/insights/lane-quote?${params.toString()}`, { cache: "no-store" })
        .then((r) => r.json() as Promise<Quote>)
        .then((q) => setQuote(q))
        .catch(() => setQuote(null))
        .finally(() => setLoading(false));
    }, 400);

    run();
  }, [
    originCity,
    originState,
    originZip,
    destinationCity,
    destinationState,
    destinationZip,
    equipmentType,
    currency,
  ]);

  if (!quote && !loading) return null;

  if (loading && !quote) {
    return (
      <div
        className={`inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-[11px] text-stone-500 ${className ?? ""}`}
      >
        <span className="h-2 w-2 animate-pulse rounded-full bg-stone-400" />
        Checking lane rate…
      </div>
    );
  }

  if (!quote || !quote.match || (quote.avgRate == null && quote.avgUsd == null)) {
    return (
      <div
        className={`inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-[11px] text-stone-500 ${className ?? ""}`}
      >
        <span className="inline-block h-2 w-2 rounded-full bg-stone-400" />
        No lane benchmark yet for this OD — use your judgment, you&apos;re seeding the data.
      </div>
    );
  }

  const yoy = quote.yoyChangePct;
  const yoyLabel =
    yoy == null
      ? null
      : `${yoy >= 0 ? "▲" : "▼"} ${Math.abs(yoy).toFixed(1)}% YoY`;
  const yoyColor = yoy == null ? "text-stone-500" : yoy >= 0 ? "text-emerald-700" : "text-rose-700";

  const matchSuffix =
    quote.matchLevel === "zip" ? "(zip-level)" :
    quote.matchLevel === "city" ? "(city-level)" :
    quote.matchLevel === "state" ? "(state-level)" : "";

  return (
    <div
      className={`inline-flex flex-wrap items-center gap-x-2 gap-y-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-medium text-emerald-900 ${className ?? ""}`}
      title={`Rolling ${quote.windowDays ?? 60}-day average from ${quote.sampleCount ?? "?"} sample(s) ${matchSuffix}`}
    >
      <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
      <span>Lane avg:</span>
      <span className="font-semibold tabular-nums">{formatLaneAvg(quote)}</span>
      {yoyLabel && <span className={`tabular-nums ${yoyColor}`}>{yoyLabel}</span>}
      <span className="text-emerald-800/70">{matchSuffix}</span>
    </div>
  );
}
