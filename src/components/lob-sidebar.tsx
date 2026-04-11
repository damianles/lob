import Image from "next/image";
import Link from "next/link";

export type LobNavId = "loads" | "tools" | "onboarding";

export type LobSidebarStats = { active: number; rush: number; delivered: number };

const items: { id: LobNavId; href: string; label: string; hint: string }[] = [
  { id: "loads", href: "/", label: "Loads", hint: "See open freight" },
  { id: "tools", href: "/tools", label: "Help & tools", hint: "Rates, paperwork, deploy help" },
  { id: "onboarding", href: "/onboarding", label: "Your account", hint: "Mill or trucking company" },
];

export function LobSidebar({
  active,
  stats,
}: {
  active: LobNavId;
  stats?: LobSidebarStats;
}) {
  return (
    <aside className="hidden w-52 shrink-0 flex-col border-r border-stone-200 bg-lob-surface lg:flex">
      <div className="border-b border-stone-200 px-3 py-4">
        <Link href="/" className="block" title="Home">
          <Image
            src="/brand/final/lob-horizontal-final.svg"
            alt="Lumber One Board"
            width={180}
            height={50}
            className="h-10 w-auto max-w-[180px]"
            priority
          />
        </Link>
      </div>
      <nav className="flex flex-col gap-1 p-3 text-sm" aria-label="Main">
        {items.map((item) => {
          const isActive = item.id === active;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={
                isActive
                  ? "rounded-md border border-lob-gold/50 bg-white px-3 py-2.5 font-semibold text-lob-navy shadow-sm"
                  : "rounded-md px-3 py-2.5 text-stone-700 hover:bg-white/80 hover:text-lob-navy"
              }
              title={item.hint}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto border-t border-stone-200 p-3 text-xs text-stone-500">
        {stats ? (
          <>
            {stats.active} open · {stats.rush} rush · {stats.delivered} delivered
          </>
        ) : (
          <>Three places to start.</>
        )}
      </div>
    </aside>
  );
}
