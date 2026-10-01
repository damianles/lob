"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, type ReactElement } from "react";

import { useAuth } from "@clerk/nextjs";

import { useViewerRole } from "@/components/providers/app-providers";
import { useOpenBidsInboxCount } from "@/components/open-bids-inbox-count";
import { cn } from "@/lib/cn";
import { lobNavItemsForViewer, type LobNavId, type LobNavItem } from "@/lib/lob-nav";

interface IconProps {
  className?: string;
  active?: boolean;
}

function LoadsIcon({ className, active }: IconProps) {
  return (
    <svg className={className} fill={active ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={active ? 0 : 2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

function CapacityIcon({ className, active }: IconProps) {
  return (
    <svg className={className} fill={active ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={active ? 0 : 2}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );
}

function ShipmentsIcon({ className, active }: IconProps) {
  return (
    <svg className={className} fill={active ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={active ? 0 : 2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function BidsIcon({ className, active }: IconProps) {
  return (
    <svg className={className} fill={active ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={active ? 0 : 2}
        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function PostIcon({ className }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.25} d="M12 4v16m8-8H4" />
    </svg>
  );
}

type MobileTabId = LobNavId | "post";

type MobileTab = {
  id: MobileTabId;
  href: string;
  label: string;
  elevated?: boolean;
};

const ICONS: Record<string, (props: IconProps) => ReactElement> = {
  shipments: ShipmentsIcon,
  openBids: BidsIcon,
  loads: LoadsIcon,
  capacity: CapacityIcon,
  post: PostIcon,
};

const SHORT_LABEL: Partial<Record<MobileTabId, string>> = {
  loads: "Loads",
  openBids: "Bids",
  shipments: "Shipments",
  capacity: "Capacity",
  post: "Post",
};

const CARRIER_MOBILE_IDS: LobNavId[] = ["shipments", "openBids", "loads", "capacity"];
const SHIPPER_MOBILE_IDS: LobNavId[] = ["shipments", "openBids", "capacity"];
const GUEST_MOBILE_IDS: LobNavId[] = ["loads", "capacity", "shipments"];
const ADMIN_MOBILE_IDS: LobNavId[] = ["shipments", "openBids", "loads", "capacity"];

function shortLabel(item: Pick<MobileTab, "id" | "label">): string {
  return SHORT_LABEL[item.id] ?? item.label;
}

function toMobileTabs(items: LobNavItem[], ids: LobNavId[]): MobileTab[] {
  return items
    .filter((i) => ids.includes(i.id))
    .map((i) => ({ id: i.id, href: i.href, label: i.label }));
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const { isSignedIn, isLoaded } = useAuth();
  const { viewer, loading } = useViewerRole();
  const inboxCount = useOpenBidsInboxCount();

  const items = useMemo((): MobileTab[] => {
    if (!isLoaded) return [];

    if (!isSignedIn) {
      return toMobileTabs(lobNavItemsForViewer("GUEST", { showOnboarding: false }), GUEST_MOBILE_IDS);
    }

    const kind = loading ? "GUEST" : viewer.kind;
    const nav = lobNavItemsForViewer(kind, { showOnboarding: false });

    if (kind === "SHIPPER") {
      const base = toMobileTabs(nav, SHIPPER_MOBILE_IDS);
      const mid = Math.min(2, base.length);
      return [
        ...base.slice(0, mid),
        { id: "post", href: "/post", label: "Post", elevated: true },
        ...base.slice(mid),
      ];
    }

    if (kind === "ADMIN") {
      const base = toMobileTabs(nav, ADMIN_MOBILE_IDS);
      const mid = Math.min(2, base.length);
      return [
        ...base.slice(0, mid),
        { id: "post", href: "/post", label: "Post", elevated: true },
        ...base.slice(mid),
      ];
    }

    if (kind === "CARRIER") {
      return toMobileTabs(nav, CARRIER_MOBILE_IDS);
    }

    // SETUP / fallback — browse + capacity while company is unfinished
    return toMobileTabs(nav, GUEST_MOBILE_IDS);
  }, [isLoaded, isSignedIn, loading, viewer.kind]);

  if (pathname?.startsWith("/sign-in") || pathname?.startsWith("/sign-up")) {
    return null;
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <>
      <div className="h-[calc(4.5rem+env(safe-area-inset-bottom,0px))] lg:hidden" aria-hidden />
      <nav
        className="
          fixed bottom-0 left-0 right-0 z-50
          lg:hidden
          border-t border-stone-200/80 bg-white/95 backdrop-blur-xl
          shadow-[0_-4px_12px_rgba(0,0,0,0.05)]
          pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]
        "
        aria-label="Mobile navigation"
      >
        <div className="flex h-16 items-end justify-around px-1">
          {items.map((item) => {
            const isActive =
              pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
            const Icon = ICONS[item.id] ?? LoadsIcon;
            const label = shortLabel(item);

            if (item.elevated) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={false}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "relative -mt-3 flex min-w-0 flex-1 flex-col items-center justify-end gap-1 px-1 pb-1.5",
                    "active:scale-95",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-full shadow-md ring-2 ring-white",
                      isActive ? "bg-lob-navy text-white" : "bg-lob-navy text-white",
                    )}
                  >
                    <Icon className="h-6 w-6" active />
                  </span>
                  <span
                    className={cn(
                      "text-[10px] font-semibold leading-none",
                      isActive ? "text-lob-navy" : "text-stone-600",
                    )}
                  >
                    {label}
                  </span>
                </Link>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 py-1.5",
                  "active:scale-95",
                  isActive ? "text-lob-navy" : "text-stone-500",
                )}
              >
                {isActive ? (
                  <span
                    className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-lob-navy"
                    aria-hidden
                  />
                ) : null}
                <div className="relative">
                  <Icon className="h-6 w-6" active={isActive} />
                  {item.id === "openBids" && inboxCount != null && inboxCount > 0 ? (
                    <span className="absolute -right-2 -top-1 min-w-[1rem] rounded-full bg-lob-navy px-1 text-[9px] font-semibold leading-4 text-white">
                      {inboxCount > 99 ? "99+" : inboxCount}
                    </span>
                  ) : null}
                </div>
                <span className={cn("text-[10px] font-medium leading-none", isActive && "font-semibold")}>
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
