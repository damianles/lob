"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export function BidWithdrawButton({ bidId }: { bidId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function withdraw() {
    setBusy(true);
    setErr(null);
    const res = await fetch(`/api/bids/${bidId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "withdraw" }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setErr(typeof data.error === "string" ? data.error : "Could not withdraw.");
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <Button type="button" size="sm" variant="ghost" disabled={busy} isLoading={busy} onClick={() => void withdraw()}>
        Withdraw
      </Button>
      {err ? <p className="text-[11px] text-red-700">{err}</p> : null}
    </div>
  );
}
