"use client";

import { useEffect } from "react";

import { DbWarmingBanner } from "@/components/db-warming-banner";
import { getDatabaseErrorGuidance } from "@/lib/db-connection-hints";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const guidance = getDatabaseErrorGuidance(error.message || "");

  useEffect(() => {
    console.error("[app error]", error.digest ?? error.message);
  }, [error]);

  return (
    <main className="mx-auto max-w-2xl p-6">
      {guidance.code === "pool_exhausted" ? (
        <DbWarmingBanner errorMessage={error.message} code={guidance.code} />
      ) : (
        <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-stone-900">This page could not load</h1>
          <p className="mt-2 text-sm text-stone-600">
            The server hit a temporary error. Wait a few seconds and try again — this is usually a busy database
            connection, not a sign-out.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="mt-4 rounded-lg bg-lob-navy px-4 py-2 text-sm font-semibold text-white hover:bg-lob-navy-hover"
          >
            Try again
          </button>
          {error.digest ? (
            <p className="mt-3 text-xs text-stone-400">
              Digest <code>{error.digest}</code>
            </p>
          ) : null}
        </section>
      )}
    </main>
  );
}
