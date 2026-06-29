"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

export function CarrierReviewActions({
  companyId,
  analyticsEnabled,
  queue = "carriers",
}: {
  companyId: string;
  analyticsEnabled: boolean;
  /** API segment — carriers queue vs suppliers queue. */
  queue?: "carriers" | "suppliers";
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function run(path: string) {
    startTransition(async () => {
      await fetch(path, {
        method: "POST",
      });
      router.refresh();
    });
  }

  function setAnalytics(enabled: boolean) {
    startTransition(async () => {
      await fetch(`/api/admin/companies/${companyId}/analytics`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ enabled }),
      });
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        className="rounded bg-emerald-600 px-3 py-1 text-xs text-white disabled:opacity-60"
        onClick={() => run(`/api/admin/${queue}/${companyId}/approve`)}
        type="button"
        disabled={isPending}
      >
        Approve
      </button>
      <button
        className="rounded bg-rose-600 px-3 py-1 text-xs text-white disabled:opacity-60"
        onClick={() => run(`/api/admin/${queue}/${companyId}/reject`)}
        type="button"
        disabled={isPending}
      >
        Reject
      </button>
      <button
        className="rounded bg-zinc-800 px-3 py-1 text-xs text-white disabled:opacity-60"
        onClick={() => setAnalytics(!analyticsEnabled)}
        type="button"
        disabled={isPending}
      >
        {analyticsEnabled ? "Disable analytics" : "Enable analytics"}
      </button>
    </div>
  );
}

