"use client";

import Link from "next/link";
import { useMemo } from "react";

import { LobWoodOIcon } from "@/components/lob-wood-o-icon";
import { useViewerRole } from "@/components/providers/app-providers";
import { BRAND_POSITIONING, BRAND_PRODUCT_NAME } from "@/lib/brand-marketing";
import { lobNavItemsForViewer, type LobNavId } from "@/lib/lob-nav";

export type { LobNavId };
export type LobSidebarStats = { active: number; rush: number; delivered: number };

export function LobSidebar({
  active,
  stats,
}: {
  active: LobNavId;
  stats?: LobSidebarStats;
}) {
  const { viewer, loading } = useViewerRole();
  const navItems = useMemo(() => {
    if (loading) return lobNavItemsForViewer("GUEST");
    const showOnboarding = viewer.kind === "SETUP" || !viewer.companyId;
    return lobNavItemsForViewer(viewer.kind, { showOnboarding });
  }, [loading, viewer.kind, viewer.companyId]);

  return (
    <aside className="hidden w-[15.5rem] shrink-0 flex-col border-r border-stone-200/50 bg-stone-50/30 lg:flex">
      <div className="border-b border-stone-200/50 px-4 pb-4 pt-6">
        <Link
          href="/"
          className="flex min-w-0 items-start gap-2.5 rounded-xl p-1.5 transition hover:bg-white/70"
          aria-label={`${BRAND_PRODUCT_NAME} — home`}
        >
          <LobWoodOIcon className="h-11 w-11 shrink-0 drop-shadow-sm" decorative />
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="text-[13px] font-semibold leading-tight tracking-tight text-lob-navy">{BRAND_PRODUCT_NAME}</p>
            <p className="mt-1 text-[9px] font-bold uppercase leading-snug tracking-[0.12em] text-lob-gold-muted">
              {BRAND_POSITIONING}
            </p>
          </div>
        </Link>
      </div>
      <div className="px-5 pb-2 pt-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-400">Navigate</p>
      </div>
      <nav
        className="flex max-h-[calc(100vh-10rem)] flex-col gap-1 overflow-y-auto px-3 pb-4 text-[13px]"
        aria-label="Main"
      >
        {navItems.map((item) => {
          const isActive = item.id === active;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={
                isActive
                  ? "rounded-xl bg-white px-4 py-2.5 font-semibold text-lob-navy shadow-sm shadow-stone-900/5 ring-1 ring-stone-200/80"
                  : "rounded-xl px-4 py-2.5 text-stone-600 transition hover:bg-white/80 hover:text-lob-navy"
              }
              title={item.hint}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto border-t border-stone-200/50 px-5 py-4 text-[11px] leading-relaxed text-stone-400">
        {stats ? (
          <>
            {stats.active} open · {stats.rush} rush · {stats.delivered} delivered
          </>
        ) : (
          <>Forest products load board</>
        )}
      </div>
    </aside>
  );
}
