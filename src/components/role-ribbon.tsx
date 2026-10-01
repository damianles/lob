"use client";

import Link from "next/link";

import { useViewerRole } from "@/components/providers/app-providers";
import { roleAccentClasses } from "@/lib/viewer-role";

/**
 * Thin ribbon under the masthead that tells the viewer which side of the
 * marketplace they're on (supplier vs carrier vs admin), or that registration is incomplete.
 *
 * - Hidden for guests
 * - Tinted using role accent classes (kept subtle — the shell stays navy)
 */
export function RoleRibbon() {
  const { viewer, loading } = useViewerRole();
  if (loading || viewer.kind === "GUEST") return null;

  const accents = roleAccentClasses(viewer);
  const showVerifyCta =
    viewer.kind === "CARRIER" && !viewer.verified && Boolean(viewer.companyId);
  const showSupplierPending =
    viewer.kind === "SHIPPER" && !viewer.verified && Boolean(viewer.companyId);

  return (
    <div
      className={`border-b ${accents.ribbonBorder} ${accents.ribbonBg}`}
      role="status"
      aria-live="polite"
    >
      <div className="mx-auto flex max-w-[1680px] items-center justify-between gap-3 px-4 py-1.5 text-[11px] sm:px-8 sm:text-xs">
        <div className={`flex min-w-0 items-center gap-2 ${accents.ribbonText}`}>
          {viewer.companyName && (
            <span className="truncate font-semibold">{viewer.companyName}</span>
          )}
          {viewer.kind === "SETUP" && (
            <span className="hidden min-w-0 truncate font-normal opacity-90 sm:inline">
              Not marked as supplier or carrier until you link a company below.
            </span>
          )}
          {viewer.verified && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium opacity-80">
              <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              Verified
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {viewer.kind === "SETUP" && (
            <Link
              href="/onboarding"
              className="font-semibold underline-offset-2 hover:underline"
            >
              Finish registration →
            </Link>
          )}
          {showVerifyCta && (
            <>
              <span className="hidden font-semibold opacity-90 sm:inline">Awaiting LOB approval</span>
              <Link
                href="/carrier/compliance"
                className="font-semibold underline-offset-2 hover:underline"
              >
                Carrier profile →
              </Link>
            </>
          )}
          {showSupplierPending && (
            <span className="font-semibold opacity-90">Awaiting LOB approval</span>
          )}
        </div>
      </div>
    </div>
  );
}
