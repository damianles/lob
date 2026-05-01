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

  const accents = roleAccentClasses(viewer.kind);
  const showVerifyCta =
    viewer.kind !== "ADMIN" && !viewer.verified && Boolean(viewer.companyId);

  return (
    <div
      className={`border-b ${accents.ribbonBorder} ${accents.ribbonBg}`}
      role="status"
      aria-live="polite"
    >
      <div className="mx-auto flex max-w-[1680px] items-center justify-between gap-3 px-5 py-1.5 text-[11px] sm:px-8 sm:text-xs">
        <div className={`flex min-w-0 items-center gap-2 ${accents.ribbonText}`}>
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] ring-1 ring-inset ${accents.pillBg} ${accents.pillText} ${accents.pillRing} sm:text-[10px]`}
          >
            {viewer.shortLabel}
          </span>
          {viewer.companyName && (
            <span className="truncate font-semibold">{viewer.companyName}</span>
          )}
          {viewer.kind === "SETUP" && (
            <span className="hidden min-w-0 truncate font-normal opacity-90 sm:inline">
              Not marked as supplier or carrier until you link a company below.
            </span>
          )}
          {viewer.verified && (
            <span className="hidden items-center gap-1 text-[10px] font-medium opacity-80 sm:inline-flex">
              <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Verified
            </span>
          )}
          {viewer.isOwnerOperator && (
            <span className="hidden rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider sm:inline-block">
              Owner-op
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {viewer.kind === "SETUP" && (
            <Link
              href="/onboarding"
              className="hidden font-semibold underline-offset-2 hover:underline sm:inline"
            >
              Finish registration →
            </Link>
          )}
          {showVerifyCta && (
            <Link
              href={viewer.kind === "CARRIER" ? "/carrier/compliance" : "/onboarding"}
              className="hidden font-semibold underline-offset-2 hover:underline sm:inline"
            >
              Complete verification →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
