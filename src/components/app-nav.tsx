"use client";

import { UserButton, useAuth } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

const coreLinks = [
  { href: "/", label: "Loads" },
  { href: "/tools", label: "Help" },
  { href: "/onboarding", label: "Account" },
];

const adminLinks = [
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

  const links = [...coreLinks, ...(isAdmin ? adminLinks : [])];

  return (
    <header className="border-b border-stone-200 bg-white shadow-sm">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2.5 sm:min-h-[3.5rem]">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-5 gap-y-2">
          <Link href="/" className="flex shrink-0 items-center" aria-label="Home — Lumber One Board">
            <Image
              src="/brand/final/lob-wordmark-final.svg"
              alt=""
              width={160}
              height={48}
              className="h-9 w-auto sm:h-10"
              role="presentation"
              priority
            />
          </Link>
          <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-stone-700" aria-label="Primary">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="font-medium hover:text-lob-navy hover:underline">
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
              className="rounded-md bg-lob-navy px-3 py-1.5 text-sm font-medium text-white hover:bg-lob-navy-hover"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
