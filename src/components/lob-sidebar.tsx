import Link from "next/link";

export type LobNavId = "loads" | "tools" | "analytics" | "compliance" | "onboarding";

export type LobSidebarStats = { active: number; rush: number; delivered: number };

const items: { id: LobNavId; href: string; label: string; hint: string }[] = [
  { id: "loads", href: "/", label: "Find loads", hint: "Open board" },
  { id: "tools", href: "/tools", label: "Tools", hint: "Shortcuts & lookups" },
  { id: "analytics", href: "/analytics", label: "Lane rates", hint: "Trends & benchmarks" },
  { id: "compliance", href: "/carrier/compliance", label: "Truck paperwork", hint: "Insurance & docs" },
  { id: "onboarding", href: "/onboarding", label: "Account setup", hint: "Mill or carrier" },
];

export function LobSidebar({
  active,
  stats,
}: {
  active: LobNavId;
  stats?: LobSidebarStats;
}) {
  return (
    <aside className="hidden w-52 shrink-0 flex-col border-r border-zinc-800 bg-zinc-900 text-zinc-300 lg:flex">
      <div className="border-b border-zinc-800 px-3 py-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">LOB</p>
        <p className="text-sm font-bold text-white">Lumber One Board</p>
      </div>
      <nav className="flex flex-col gap-0.5 p-2 text-sm" aria-label="Main">
        {items.map((item) => {
          const isActive = item.id === active;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={
                isActive
                  ? "rounded bg-sky-600 px-3 py-2 font-medium text-white"
                  : "rounded px-3 py-2 hover:bg-zinc-800"
              }
              title={item.hint}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto border-t border-zinc-800 p-3 text-xs leading-relaxed text-zinc-500">
        {stats ? (
          <>
            Open loads {stats.active}
            <br />
            Rush {stats.rush} · Delivered {stats.delivered}
          </>
        ) : (
          <>Use the menu to move between areas.</>
        )}
      </div>
    </aside>
  );
}
