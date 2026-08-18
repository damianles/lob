"use client";

import { UserButton, useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { startTransition, useEffect, useState } from "react";

import { useViewerRole } from "@/components/providers/app-providers";
import { cn } from "@/lib/cn";
import { shouldShowGlobalAdminBar } from "@/lib/actor-permissions";
import { signInUrlForAppPath, signUpUrlForAppPath } from "@/lib/guest-auth-routes";
import { lobTopNavLinksForViewer } from "@/lib/lob-nav";
import { lobWoodOutlineButtonClass, lobWoodPrimaryButtonClass } from "@/lib/lob-button-styles";
import type { MeApiResponse } from "@/lib/viewer-role";
import { roleAccentClasses } from "@/lib/viewer-role";

const adminLinks = [
  { href: "/admin/test-lab", label: "Test Lab" },
  { href: "/admin/carriers", label: "Carriers" },
  { href: "/admin/suppliers", label: "Suppliers" },
  { href: "/admin/companies", label: "Companies" },
];

export function AppNav() {
  const { isSignedIn } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const { viewer } = useViewerRole();
  const accents = roleAccentClasses(viewer);

  useEffect(() => {
    if (!isSignedIn) {
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
  }, [isSignedIn]);

  const guestLinks = [
    { href: signUpUrlForAppPath("/"), label: "Register" },
    { href: signUpUrlForAppPath("/capacity"), label: "Capacity" },
    { href: signUpUrlForAppPath("/insights"), label: "Insights" },
    { href: signInUrlForAppPath("/"), label: "Sign In" },
  ];
  const signedInLinks = lobTopNavLinksForViewer(viewer.kind);
  const links = [
    ...(isSignedIn ? signedInLinks : guestLinks),
    ...(isSignedIn && isAdmin ? adminLinks : []),
  ];

  return (
    <header className="relative z-50 border-b border-stone-200/50 bg-white/75 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60 lg:sticky lg:top-0">
      <div className="mx-auto flex max-w-[1680px] items-center justify-between gap-3 px-3 py-2 sm:gap-6 sm:px-8 sm:py-4">
        <div className="flex min-w-0 flex-1 items-center">
          <nav className="hide-scrollbar -mx-1 flex min-w-0 flex-1 items-center gap-x-1 overflow-x-auto px-1 sm:flex-wrap sm:gap-y-1.5 sm:overflow-visible" aria-label="Primary">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold transition sm:px-4 sm:py-2 sm:text-sm",
                  !isSignedIn && l.label === "Register"
                    ? lobWoodPrimaryButtonClass
                    : "text-stone-600 hover:bg-stone-100 hover:text-lob-navy",
                )}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex shrink-0 items-center justify-end gap-2 pl-2 sm:gap-3">
          {isSignedIn && viewer.kind !== "GUEST" && (
            <span
              className={`inline-flex max-w-[10rem] shrink-0 items-center justify-center gap-1 truncate rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ring-1 ring-inset sm:max-w-none ${accents.pillBg} ${accents.pillText} ${accents.pillRing}`}
              title={viewer.label}
              aria-label={viewer.label}
            >
              {viewer.shortLabel}
            </span>
          )}
          {isSignedIn ? (
            <UserButton />
          ) : (
            <Link
              href={signInUrlForAppPath("/")}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition sm:px-5 sm:py-2.5 sm:text-sm ${lobWoodOutlineButtonClass}`}
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
