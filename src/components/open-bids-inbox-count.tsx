"use client";

import { useEffect, useState } from "react";

import { useViewerRole } from "@/components/providers/app-providers";

let summaryInflight: Promise<number | null> | null = null;
let summaryAt = 0;

function loadInboxCount() {
  const now = Date.now();
  if (summaryInflight && now - summaryAt < 15_000) return summaryInflight;
  summaryAt = now;
  summaryInflight = fetch("/api/bids/summary", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : null))
    .then((j: { pendingInbox?: number } | null) =>
      typeof j?.pendingInbox === "number" ? j.pendingInbox : 0,
    )
    .catch(() => null);
  return summaryInflight;
}

export function useOpenBidsInboxCount() {
  const { viewer, loading } = useViewerRole();
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (loading) return;
    if (viewer.kind !== "SHIPPER" && viewer.kind !== "CARRIER" && viewer.kind !== "ADMIN") {
      setCount(null);
      return;
    }
    let cancelled = false;
    void loadInboxCount().then((n) => {
      if (!cancelled) setCount(n);
    });
    return () => {
      cancelled = true;
    };
  }, [loading, viewer.kind, viewer.companyId]);

  return count;
}

export function OpenBidsCountBadge({ count }: { count: number | null }) {
  if (count == null || count <= 0) return null;
  return (
    <span className="ml-1 inline-flex min-w-[1.15rem] items-center justify-center rounded-full bg-lob-navy px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}
