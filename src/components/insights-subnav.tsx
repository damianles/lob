"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/insights/lanes", label: "Lane rate analytics" },
  { href: "/insights/fuel", label: "Fuel pricing" },
] as const;

export function InsightsSubnav() {
  const pathname = usePathname();
  return (
    <nav className="mb-6 flex flex-wrap gap-2 border-b border-zinc-200 pb-4" aria-label="Insights">
      {tabs.map((t) => {
        const active = pathname === t.href || pathname.startsWith(`${t.href}/`);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={
              active
                ? "rounded-md bg-lob-navy px-3 py-2 text-sm font-semibold text-white"
                : "rounded-md px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 hover:text-lob-navy"
            }
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
