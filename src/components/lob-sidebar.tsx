"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

import { OpenBidsCountBadge, useOpenBidsInboxCount } from "@/components/open-bids-inbox-count";
import { useViewerRole } from "@/components/providers/app-providers";
import { lobNavItemsForViewer, type LobNavId } from "@/lib/lob-nav";

const ADMIN_LINKS = [
  { href: "/admin/carriers", label: "Carriers" },
  { href: "/admin/suppliers", label: "Suppliers" },
  { href: "/admin/companies", label: "Companies" },
  { href: "/admin/test-lab", label: "Test Lab" },
] as const;

export type { LobNavId };
export type LobSidebarStats = { active: number; rush: number; delivered: number };

export function LobSidebar({
  active,
  stats,
}: {
  active: LobNavId;
  stats?: LobSidebarStats;
}) {
  const pathname = usePathname() ?? "";
  const { viewer, loading } = useViewerRole();
  const inboxCount = useOpenBidsInboxCount();
  const navItems = useMemo(() => {
    if (loading) return lobNavItemsForViewer("GUEST");
    const showOnboarding = viewer.kind === "SETUP" || !viewer.companyId;
    return lobNavItemsForViewer(viewer.kind, { showOnboarding });
  }, [loading, viewer.kind, viewer.companyId]);

  return (
    <aside className="hidden w-[15.5rem] shrink-0 flex-col border-r border-stone-200/50 bg-stone-50/30 lg:flex">
      <nav
        className="flex max-h-[calc(100vh-8rem)] flex-col gap-1 overflow-y-auto px-3 pb-4 pt-4 text-[13px]"
        aria-label="Main"
      >
        {navItems.map((item) => {
          const isActive = item.id === active;
          return (
            <Link
              key={item.id}
              href={item.href}
              prefetch={false}
              className={
                isActive
                  ? "rounded-xl bg-white px-4 py-2.5 font-semibold text-lob-navy shadow-sm shadow-stone-900/5 ring-1 ring-stone-200/80"
                  : "rounded-xl px-4 py-2.5 text-stone-600 transition hover:bg-white/80 hover:text-lob-navy"
              }
              title={item.hint}
            >
              {item.label}
              {item.id === "openBids" ? <OpenBidsCountBadge count={inboxCount} /> : null}
            </Link>
          );
        })}
        {viewer.kind === "ADMIN" ? (
          <div className="mt-4 border-t border-stone-200/80 pt-3">
            <p className="px-4 pb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-400">
              Admin
            </p>
            {ADMIN_LINKS.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={false}
                  className={
                    isActive
                      ? "block rounded-xl bg-white px-4 py-2.5 font-semibold text-lob-navy shadow-sm shadow-stone-900/5 ring-1 ring-stone-200/80"
                      : "block rounded-xl px-4 py-2.5 text-stone-600 transition hover:bg-white/80 hover:text-lob-navy"
                  }
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        ) : null}
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
