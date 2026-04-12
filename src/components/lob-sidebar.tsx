import Link from "next/link";

import { LobBrandMark } from "@/components/lob-brand-mark";

export type LobNavId =
  | "loads"
  | "capacity"
  | "insights"
  | "booked"
  | "driver"
  | "facilityPickup"
  | "facilityDelivery"
  | "carrierProfile"
  | "onboarding";

export type LobSidebarStats = { active: number; rush: number; delivered: number };

const items: { id: LobNavId; href: string; label: string; hint: string }[] = [
  { id: "loads", href: "/", label: "Loads", hint: "Posted loads from mills & wholesalers" },
  { id: "capacity", href: "/capacity", label: "Capacity", hint: "Carrier truck availability by lane & dates" },
  { id: "insights", href: "/insights", label: "Insights", hint: "Lane rate analytics & fuel pricing" },
  { id: "booked", href: "/booked", label: "Booked freight", hint: "Confirmed bookings & live status" },
  { id: "driver", href: "/driver", label: "Driver", hint: "Dispatch links & QR for drivers" },
  {
    id: "facilityPickup",
    href: "/scan/pickup",
    label: "Facility pickup",
    hint: "Scan driver QR at pickup — no account required",
  },
  {
    id: "facilityDelivery",
    href: "/scan/delivery",
    label: "Facility delivery",
    hint: "Scan driver QR at delivery — no account required",
  },
  {
    id: "carrierProfile",
    href: "/carrier/compliance",
    label: "Carrier profile",
    hint: "DOT/MC, insurance, fleet & equipment for shippers",
  },
  { id: "onboarding", href: "/onboarding", label: "Your account", hint: "Link mill or transport company" },
];

export function LobSidebar({
  active,
  stats,
}: {
  active: LobNavId;
  stats?: LobSidebarStats;
}) {
  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r border-stone-200 bg-lob-surface lg:flex">
      <div className="flex min-h-[4.25rem] items-center border-b border-stone-200 px-3 py-3">
        <Link href="/" className="flex w-full items-center" title="Home">
          <LobBrandMark className="h-11 w-auto max-w-[208px] sm:h-12 sm:max-w-[220px]" priority />
        </Link>
      </div>
      <nav className="flex max-h-[calc(100vh-10rem)] flex-col gap-1 overflow-y-auto p-3 text-sm" aria-label="Main">
        {items.map((item) => {
          const isActive = item.id === active;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={
                isActive
                  ? "rounded-md border border-lob-gold/50 bg-white px-3 py-2 font-semibold text-lob-navy shadow-sm"
                  : "rounded-md px-3 py-2 text-stone-700 hover:bg-white/80 hover:text-lob-navy"
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
          <>Lumber One Board</>
        )}
      </div>
    </aside>
  );
}
