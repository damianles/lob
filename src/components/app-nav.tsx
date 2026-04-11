"use client";

import { UserButton, useAuth } from "@clerk/nextjs";
import Link from "next/link";

const links = [
  { href: "/", label: "Find loads" },
  { href: "/tools", label: "Tools" },
  { href: "/analytics", label: "Lane rates" },
  { href: "/carrier/compliance", label: "Truck paperwork" },
  { href: "/onboarding", label: "Account setup" },
  { href: "/admin/carriers", label: "Admin · Carriers" },
  { href: "/admin/companies", label: "Admin · Companies" },
];

export function AppNav() {
  const { isSignedIn } = useAuth();

  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <nav className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-700">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-zinc-950">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          {isSignedIn ? (
            <UserButton />
          ) : (
            <Link href="/sign-in" className="text-sm font-medium text-zinc-900 underline">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
