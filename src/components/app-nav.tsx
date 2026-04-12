"use client";

import { UserButton, useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { startTransition, useEffect, useState } from "react";

import { LobWoodOMark } from "@/components/lob-wood-o-mark";
import { BRAND_PRODUCT_NAME } from "@/lib/brand-marketing";

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
    <header className="sticky top-0 z-50 border-b border-stone-200/50 bg-white/75 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto flex max-w-[1680px] items-center justify-between gap-6 px-5 py-3.5 sm:px-8 sm:py-4">
        <div className="flex min-w-0 flex-1 items-center gap-8">
          <Link
            href="/"
            className="group flex shrink-0 rounded-full p-2 ring-offset-2 transition hover:bg-stone-100/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lob-navy/25"
            aria-label={`${BRAND_PRODUCT_NAME} — home`}
          >
            <LobWoodOMark className="h-9 w-9 sm:h-10 sm:w-10" />
          </Link>
          <nav className="flex min-w-0 flex-wrap items-center gap-x-1 gap-y-1.5" aria-label="Primary">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-full px-3.5 py-2 text-[13px] font-medium text-stone-600 transition hover:bg-stone-100 hover:text-lob-navy sm:px-4 sm:text-sm"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex shrink-0 items-center gap-2 pl-2">
          {isSignedIn ? (
            <UserButton />
          ) : (
            <Link
              href="/sign-in"
              className="rounded-full bg-lob-navy px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-lob-navy-hover"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
