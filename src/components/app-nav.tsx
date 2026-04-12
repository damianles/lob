"use client";

import { UserButton, useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useState } from "react";

import { LobBrandMark } from "@/components/lob-brand-mark";
import { BRAND_POSITIONING, BRAND_PRODUCT_NAME } from "@/lib/brand-marketing";

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
      setIsAdmin(false);
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
    <header className="sticky top-0 z-50 overflow-visible border-b border-stone-200/60 bg-white/80 shadow-[0_1px_0_rgba(0,18,51,0.04)] backdrop-blur-md supports-[backdrop-filter]:bg-white/65">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-x-4 gap-y-3 overflow-visible px-4 py-3 sm:min-h-[3.75rem]">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-6 gap-y-2 overflow-visible">
          <Link
            href="/"
            className="group flex shrink-0 items-center gap-3 overflow-visible rounded-xl py-1 pr-2 transition-opacity hover:opacity-90"
            aria-label={`Home — ${BRAND_PRODUCT_NAME}`}
          >
            <LobBrandMark className="relative h-[2.5rem] w-[9.25rem] shrink-0 sm:h-11 sm:w-[10.5rem]" priority />
            <span className="hidden min-w-0 flex-col sm:flex">
              <span className="truncate text-sm font-semibold leading-tight text-lob-navy">{BRAND_PRODUCT_NAME}</span>
              <span className="truncate text-[11px] font-medium uppercase tracking-wide text-lob-gold-muted">
                {BRAND_POSITIONING}
              </span>
            </span>
          </Link>
          <nav
            className="flex flex-wrap items-center gap-x-0.5 gap-y-1 text-sm text-stone-600 sm:gap-x-1"
            aria-label="Primary"
          >
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-full px-3 py-1.5 font-medium text-stone-600 transition hover:bg-lob-navy/[0.06] hover:text-lob-navy"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {isSignedIn ? (
            <UserButton />
          ) : (
            <Link
              href="/sign-in"
              className="rounded-full bg-lob-navy px-5 py-2 text-sm font-semibold text-white shadow-sm shadow-lob-navy/25 transition hover:bg-lob-navy-hover"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
