"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, type ReactElement } from "react";

import { useAuth } from "@clerk/nextjs";

import { useViewerRole } from "@/components/providers/app-providers";
import { cn } from "@/lib/cn";
import { signUpUrlForAppPath } from "@/lib/guest-auth-routes";
import { lobNavItemsForViewer, type LobNavId } from "@/lib/lob-nav";

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

function InsightsIcon({ className, active }: IconProps) {
  return (
    <svg className={className} fill={active ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={active ? 0 : 2}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
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

const ICONS: Record<string, (props: IconProps) => ReactElement> = {
  shipments: ShipmentsIcon,
  openBids: BidsIcon,
  loads: LoadsIcon,
  capacity: CapacityIcon,
  insights: InsightsIcon,
};

const MOBILE_IDS: LobNavId[] = ["shipments", "openBids", "loads", "capacity", "insights"];

export function MobileBottomNav() {
  const pathname = usePathname();
  const { isSignedIn, isLoaded } = useAuth();
  const { viewer, loading } = useViewerRole();

  const items = useMemo(() => {
    const kind = loading ? "GUEST" : viewer.kind;
    return lobNavItemsForViewer(kind, { showOnboarding: false }).filter((i) => MOBILE_IDS.includes(i.id));
  }, [loading, viewer.kind]);

  if (pathname?.startsWith("/sign-in") || pathname?.startsWith("/sign-up")) {
    return null;
  }

  const linkHref = (href: string) => (isLoaded && !isSignedIn ? signUpUrlForAppPath(href) : href);

  return (
    <nav
      className="
        fixed bottom-0 left-0 right-0 z-50
        lg:hidden
        bg-white/95 backdrop-blur-xl
        border-t border-stone-200/80
        shadow-[0_-4px_12px_rgba(0,0,0,0.05)]
        pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]
      "
      aria-label="Mobile navigation"
    >
      <div className="flex justify-around items-center h-16">
        {items.map((item) => {
          const isActive =
            pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
          const Icon = ICONS[item.id] ?? LoadsIcon;

          return (
            <Link
              key={item.href}
              href={linkHref(item.href)}
              className={cn(
                "flex flex-col items-center justify-center gap-1",
                "min-w-0 flex-1 px-2 py-1.5",
                "transition-all duration-200",
                "active:scale-95",
                isActive ? "text-lob-navy" : "text-stone-500 hover:text-stone-700",
              )}
            >
              <div className={cn("transition-transform duration-200", isActive && "scale-110")}>
                <Icon className="w-6 h-6" active={isActive} />
              </div>
              <span className={cn("text-[10px] font-medium leading-none", isActive && "font-semibold")}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
