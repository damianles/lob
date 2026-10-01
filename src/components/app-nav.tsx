"use client";

import { UserButton, useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { startTransition, useEffect, useState } from "react";

import { AppNotifications } from "@/components/app-notifications";
import { useViewerRole } from "@/components/providers/app-providers";
import { cn } from "@/lib/cn";
import { shouldShowGlobalAdminBar } from "@/lib/actor-permissions";
import { signInUrlForAppPath, signUpUrlForAppPath } from "@/lib/guest-auth-routes";
import { lobTopNavLinksForViewer } from "@/lib/lob-nav";
import { lobWoodOutlineButtonClass, lobWoodPrimaryButtonClass } from "@/lib/lob-button-styles";
import type { MeApiResponse } from "@/lib/viewer-role";
import { roleAccentClasses } from "@/lib/viewer-role";

const adminLinks = [
  { href: "/admin/carriers", label: "Carriers" },
  { href: "/admin/suppliers", label: "Suppliers" },
  { href: "/admin/companies", label: "Companies" },
  { href: "/admin/test-lab", label: "Test Lab" },
];

function isCurrentPath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNav() {
  const pathname = usePathname() ?? "/";
  const { isSignedIn, isLoaded } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const { viewer } = useViewerRole();
  const accents = roleAccentClasses(viewer);
  const signedIn = isLoaded && Boolean(isSignedIn);

  useEffect(() => {
    if (!signedIn) {
      startTransition(() => setIsAdmin(false));
      return;
    }
    let cancelled = false;
    void fetch("/api/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: MeApiResponse) => {
        if (!cancelled) setIsAdmin(shouldShowGlobalAdminBar(d));
      })
      .catch(() => {
        if (!cancelled) setIsAdmin(false);
      });
    return () => {
      cancelled = true;
    };
  }, [signedIn]);

  const signedInLinks = [
    ...lobTopNavLinksForViewer(viewer.kind),
    ...(isAdmin ? adminLinks : []),
  ];

  return (
    <header className="relative z-50 border-b border-stone-200/50 bg-white/75 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60 lg:sticky lg:top-0">
      <div className="mx-auto flex max-w-[1680px] items-center justify-between gap-3 px-3 py-2 sm:px-8 sm:py-3">
        {signedIn ? (
          <nav
            className="hide-scrollbar -mx-1 flex min-w-0 flex-1 items-center gap-x-1 overflow-x-auto px-1 lg:hidden"
            aria-label="Primary"
          >
            {signedInLinks.map((l) => {
              const current = isCurrentPath(pathname, l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  prefetch={false}
                  aria-current={current ? "page" : undefined}
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold",
                    current ? "bg-lob-navy text-white" : "text-stone-600 hover:bg-stone-100 hover:text-lob-navy",
                  )}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
        ) : (
          <div className="min-w-0 flex-1" />
        )}
        <div className="flex shrink-0 items-center justify-end gap-2 pl-2 sm:gap-3">
          {signedIn && viewer.kind !== "GUEST" && (
            <span
              className={`inline-flex max-w-[10rem] shrink-0 items-center justify-center gap-1 truncate rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ring-1 ring-inset sm:max-w-none ${accents.pillBg} ${accents.pillText} ${accents.pillRing}`}
              title={viewer.label}
              aria-label={viewer.label}
            >
              {viewer.shortLabel}
            </span>
          )}
          {signedIn ? (
            <>
              <AppNotifications />
              <UserButton />
            </>
          ) : (
            <>
              <Link
                href={signUpUrlForAppPath("/")}
                className={`${lobWoodPrimaryButtonClass} min-h-9 px-3.5 py-1.5 text-xs sm:px-5 sm:text-sm`}
              >
                Create account
              </Link>
              <Link
                href={signInUrlForAppPath("/")}
                className={`${lobWoodOutlineButtonClass} min-h-9 px-3.5 py-1.5 text-xs sm:px-5 sm:text-sm`}
              >
                Sign in
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
