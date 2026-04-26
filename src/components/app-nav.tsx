"use client";

import { UserButton, useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { startTransition, useEffect, useState } from "react";

import { LobWoodOIcon } from "@/components/lob-wood-o-icon";
import { lobAppIconAlt } from "@/components/lob-app-icon-mark";
import { useDistanceUnitPreference, useViewerRole } from "@/components/providers/app-providers";
import { RadioChoice } from "@/components/ui/radio-choice";
import { roleAccentClasses } from "@/lib/viewer-role";

const signedInLinks = [
  { href: "/", label: "Loads" },
  { href: "/capacity", label: "Capacity" },
  { href: "/insights", label: "Insights" },
  { href: "/booked", label: "Booked" },
  { href: "/onboarding", label: "Account setup" },
];

const adminLinks = [
  { href: "/admin/test-lab", label: "Test lab" },
  { href: "/admin/carriers", label: "Carriers" },
  { href: "/admin/companies", label: "Companies" },
];

export function AppNav() {
  const { isSignedIn } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const { distanceUnit, setDistanceUnit } = useDistanceUnitPreference();
  const { viewer } = useViewerRole();
  const accents = roleAccentClasses(viewer.kind);

  useEffect(() => {
    if (!isSignedIn) {
      startTransition(() => setIsAdmin(false));
      return;
    }
    let cancelled = false;
    void fetch("/api/me")
      .then((r) => r.json())
      .then((d: { role?: string }) => {
        if (!cancelled) setIsAdmin(d.role === "ADMIN");
      })
      .catch(() => {
        if (!cancelled) setIsAdmin(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isSignedIn]);

  const guestLinks = [
    { href: "/", label: "Loads" },
    { href: "/insights", label: "Insights" },
  ];
  const links = [
    ...(isSignedIn ? signedInLinks : guestLinks),
    ...(isSignedIn && isAdmin ? adminLinks : []),
  ];

  return (
    <header className="relative z-50 border-b border-stone-200/50 bg-white/75 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60 lg:sticky lg:top-0">
      <div className="mx-auto flex max-w-[1680px] items-center justify-between gap-3 px-3 py-2 sm:gap-6 sm:px-8 sm:py-4">
        <div className="flex min-w-0 flex-1 items-center gap-8">
          <Link
            href="/"
            className="group hidden shrink-0 rounded-xl p-1.5 ring-offset-2 transition hover:bg-stone-100/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lob-navy/25 sm:flex"
            aria-label={lobAppIconAlt()}
          >
            <LobWoodOIcon className="h-10 w-10 shrink-0 drop-shadow-sm sm:h-11 sm:w-11" decorative />
          </Link>
          <nav className="hide-scrollbar -mx-1 flex min-w-0 flex-1 items-center gap-x-1 overflow-x-auto px-1 sm:flex-wrap sm:gap-y-1.5 sm:overflow-visible" aria-label="Primary">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="shrink-0 rounded-full px-3 py-1.5 text-[12px] font-medium text-stone-600 transition hover:bg-stone-100 hover:text-lob-navy sm:px-4 sm:py-2 sm:text-sm"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex shrink-0 items-center justify-end gap-2 pl-2 sm:gap-3">
          {isSignedIn && viewer.kind !== "GUEST" && (
            <span
              className={`hidden items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ring-1 ring-inset sm:inline-flex ${accents.pillBg} ${accents.pillText} ${accents.pillRing}`}
              title={viewer.label}
            >
              {viewer.shortLabel}
            </span>
          )}
          <RadioChoice
            label="Distance units"
            name="lob-nav-distance-unit"
            value={distanceUnit}
            onChange={setDistanceUnit}
            options={[
              { value: "mi", label: "mi" },
              { value: "km", label: "km" },
            ]}
            className="hidden sm:block [&_label]:px-2.5 [&_label]:py-1.5 [&_label]:text-xs"
          />
          {isSignedIn ? (
            <UserButton />
          ) : (
            <Link
              href="/sign-in"
              className="rounded-full bg-lob-navy px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-lob-navy-hover sm:px-5 sm:py-2.5 sm:text-sm"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
