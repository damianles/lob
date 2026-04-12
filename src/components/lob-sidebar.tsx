import Link from "next/link";

import { LobBrandMark } from "@/components/lob-brand-mark";
import { BRAND_POSITIONING } from "@/lib/brand-marketing";

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
  { id: "onboarding", href: "/onboarding", label: "Account setup", hint: "Link supplier or carrier company" },
];

export function LobSidebar({
  active,
  stats,
}: {
  active: LobNavId;
  stats?: LobSidebarStats;
}) {
  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r border-stone-200/70 bg-gradient-to-b from-white to-lob-surface lg:flex">
      <div className="flex flex-col gap-2 px-4 pb-4 pt-5">
        <Link href="/" className="block w-full overflow-visible" title="Home">
          <LobBrandMark className="relative h-11 w-[11.5rem] max-w-full shrink-0 sm:h-12 sm:w-[12.5rem]" priority />
        </Link>
        <p className="text-[10px] font-semibold uppercase leading-tight tracking-[0.12em] text-lob-gold-muted">
          {BRAND_POSITIONING}
        </p>
      </div>
      <nav
        className="flex max-h-[calc(100vh-10rem)] flex-col gap-0.5 overflow-y-auto px-3 pb-3 text-sm"
        aria-label="Main"
      >
        {items.map((item) => {
          const isActive = item.id === active;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={
                isActive
                  ? "rounded-lg bg-lob-navy/[0.07] px-3 py-2 font-semibold text-lob-navy ring-1 ring-lob-navy/10"
                  : "rounded-lg px-3 py-2 text-stone-600 transition hover:bg-white/90 hover:text-lob-navy"
              }
              title={item.hint}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto border-t border-stone-200/60 p-3 text-xs text-stone-500">
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
