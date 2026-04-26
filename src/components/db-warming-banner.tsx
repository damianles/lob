"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  /**
   * Pool-exhaustion / DB-warmup error message (raw Prisma text). The component
   * decides which UI to show: a soft "warming up" banner that auto-retries,
   * or the original red error block (rendered by the caller).
   */
  errorMessage: string;
  /**
   * Returned by getDatabaseErrorGuidance(). When code === "pool_exhausted" we
   * render the soft retry banner — otherwise the caller keeps showing the
   * existing detailed error block.
   */
  code: "direct_supabase_host" | "pool_exhausted" | "generic";
};

/**
 * Soft, polite DB warming banner. When Supabase's session pooler is briefly
 * exhausted (cold-start spike on Vercel), we want users to see a calm
 * "give us a sec" instead of a scary red error wall.
 *
 * - Renders only for pool_exhausted errors.
 * - Auto-retries with router.refresh() at 5s, 10s, then 20s.
 * - Caller still renders the detailed red panel for other error codes.
 */
export function DbWarmingBanner({ errorMessage, code }: Props) {
  const router = useRouter();
  const [attempt, setAttempt] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(5);

  useEffect(() => {
    if (code !== "pool_exhausted") return;
    if (attempt >= 3) return;

    const timer = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(timer);
          setAttempt((a) => a + 1);
          // Reload the server component data without a full nav.
          router.refresh();
          return [10, 20, 30][Math.min(attempt + 1, 2)] ?? 30;
        }
        return s - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [attempt, code, router]);

  if (code !== "pool_exhausted") return null;
  if (attempt >= 3) {
    return (
      <section className="mb-4 rounded-2xl border border-amber-300/70 bg-amber-50 p-5 text-amber-950 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white">
            !
          </span>
          <div>
            <h2 className="text-base font-semibold tracking-tight">
              Still busy after 3 retries — the database pool is full
            </h2>
            <p className="mt-1 text-sm leading-relaxed">
              Supabase&apos;s session pooler is at its connection limit. The board will reload itself when capacity frees
              up, or you can refresh the page manually. If this persists, set <code className="rounded bg-amber-100 px-1">DATABASE_POOL_MAX=1</code> in Vercel and redeploy.
            </p>
            <button
              type="button"
              onClick={() => {
                setAttempt(0);
                setSecondsLeft(5);
              }}
              className="mt-3 rounded-lg bg-amber-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-800"
            >
              Try again
            </button>
            <details className="mt-3 text-xs text-amber-900/80">
              <summary className="cursor-pointer">Technical detail</summary>
              <pre className="mt-2 whitespace-pre-wrap break-words font-mono">{errorMessage}</pre>
            </details>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      className="mb-4 rounded-2xl border border-amber-200/70 bg-gradient-to-b from-amber-50 to-white p-4 shadow-sm"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
        <span className="inline-flex h-7 w-7 shrink-0 animate-pulse items-center justify-center rounded-full bg-amber-100 text-amber-700">
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-30" />
            <path
              d="M12 2a10 10 0 0110 10"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-amber-900">Warming up the database…</p>
          <p className="text-xs text-amber-800">
            Reconnecting to Supabase. Auto-retry in <span className="font-mono">{secondsLeft}s</span> (attempt{" "}
            {attempt + 1} of 3).
          </p>
        </div>
      </div>
    </section>
  );
}
