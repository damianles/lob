import { TAKE_IT_LABEL } from "@/lib/rate-mode";
import type { ViewerKind } from "@/lib/viewer-role";

export type LobNavId =
  | "loads"
  | "capacity"
  | "insights"
  | "shipments"
  | "openBids"
  | "driver"
  | "facilityPickup"
  | "facilityDelivery"
  | "carrierProfile"
  | "carrierPrefs"
  | "onboarding";

export type LobNavItem = {
  id: LobNavId;
  href: string;
  label: string;
  hint: string;
};

/** Order here is display order. Shipments is first for every persona that has it. */
export const LOB_NAV_ITEMS: LobNavItem[] = [
  {
    id: "shipments",
    href: "/shipments",
    label: "Shipments",
    hint: "Track your shipments — sortable, filterable, exportable",
  },
  {
    id: "openBids",
    href: "/bids",
    label: "Open Bids",
    hint: `${TAKE_IT_LABEL} counters and open-bid loads waiting on a decision`,
  },
  {
    id: "loads",
    href: "/",
    label: "Open Loads",
    hint: "Posted loads from mills & wholesalers available to book",
  },
  {
    id: "capacity",
    href: "/capacity",
    label: "Capacity",
    hint: "Carrier truck availability by lane & dates",
  },
  { id: "insights", href: "/insights", label: "Insights", hint: "Lane rate analytics" },
  { id: "driver", href: "/driver", label: "Driver", hint: "Dispatch links & QR for drivers" },
  {
    id: "facilityPickup",
    href: "/scan/pickup",
    label: "Facility pickup",
    hint: "Pickup yard link or office QR — no account required",
  },
  {
    id: "facilityDelivery",
    href: "/scan/delivery",
    label: "Facility delivery",
    hint: "Receiver link or office QR — no account required",
  },
  {
    id: "carrierProfile",
    href: "/carrier/compliance",
    label: "Carrier profile",
    hint: "DOT/MC, insurance, fleet & equipment for shippers",
  },
  {
    id: "carrierPrefs",
    href: "/shipper/carrier-preferences",
    label: "Carrier preferences",
    hint: "Exclude carriers from capacity & your loads; use with per-load tiers when posting",
  },
  { id: "onboarding", href: "/onboarding", label: "Account setup", hint: "Link supplier or carrier company" },
];

const CARRIER_IDS: LobNavId[] = [
  "shipments",
  "loads",
  "openBids",
  "capacity",
  "insights",
  "driver",
  "carrierProfile",
  "onboarding",
];

const SHIPPER_IDS: LobNavId[] = [
  "shipments",
  "openBids",
  "capacity",
  "insights",
  "facilityPickup",
  "facilityDelivery",
  "carrierPrefs",
  "onboarding",
];

const SETUP_IDS: LobNavId[] = ["shipments", "capacity", "onboarding"];

function navIdsForKind(kind: ViewerKind): Set<LobNavId> {
  switch (kind) {
    case "CARRIER":
      return new Set(CARRIER_IDS);
    case "SHIPPER":
      return new Set(SHIPPER_IDS);
    case "SETUP":
      return new Set(SETUP_IDS);
    case "ADMIN":
      return new Set(LOB_NAV_ITEMS.map((i) => i.id));
    default:
      return new Set(["shipments", "loads", "capacity", "insights", "onboarding"]);
  }
}

export function lobNavItemsForViewer(
  kind: ViewerKind,
  opts?: { showOnboarding?: boolean },
): LobNavItem[] {
  const allowed = navIdsForKind(kind);
  const showOnboarding = opts?.showOnboarding ?? true;

  return LOB_NAV_ITEMS.filter((item) => {
    if (item.id === "onboarding" && !showOnboarding) return false;
    return allowed.has(item.id);
  }).map((item) => {
    if (item.id === "loads") {
      return {
        ...item,
        hint: "Browse open freight posted by mills and wholesalers (unless you are excluded)",
      };
    }
    if (item.id === "shipments" && kind === "SHIPPER") {
      return { ...item, hint: "Your company's shipments only — post, track, and export" };
    }
    if (item.id === "shipments" && kind === "CARRIER") {
      return { ...item, hint: "Your booked shipments — dispatch, pickup, and delivery history" };
    }
    if (item.id === "openBids" && kind === "SHIPPER") {
      return { ...item, hint: `Review carrier bids and ${TAKE_IT_LABEL} counters on your posted loads` };
    }
    if (item.id === "openBids" && kind === "CARRIER") {
      return { ...item, hint: "Open-bid freight and your pending bids or counters" };
    }
    return item;
  });
}

/** Top masthead links (mobile / compact). */
export function lobTopNavLinksForViewer(kind: ViewerKind): { href: string; label: string }[] {
  const sidebar = lobNavItemsForViewer(kind, {
    showOnboarding: kind === "SETUP" || kind === "GUEST",
  });
  return sidebar
    .filter((i) => i.id !== "facilityPickup" && i.id !== "facilityDelivery")
    .map((i) => ({ href: i.href, label: i.label }));
}
