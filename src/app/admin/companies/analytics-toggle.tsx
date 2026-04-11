"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

export function AnalyticsToggle({
  companyId,
  enabled,
}: {
  companyId: string;
  enabled: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      className="rounded bg-zinc-900 px-3 py-1 text-xs text-white disabled:opacity-60"
      disabled={isPending}
      type="button"
      onClick={() =>
        startTransition(async () => {
          await fetch(`/api/admin/companies/${companyId}/analytics`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-user-role": "ADMIN",
            },
            body: JSON.stringify({ enabled: !enabled }),
          });
          router.refresh();
        })
      }
    >
      {enabled ? "Disable analytics" : "Enable analytics"}
    </button>
  );
}

