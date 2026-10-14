import { NotificationEvent } from "@prisma/client";

export type NoticeSide = "shipper" | "carrier";

type Audience = NoticeSide | "both";

export type NoticeEventDef = {
  event: NotificationEvent;
  audience: Audience;
  group: "Booking and bids" | "Dates" | "Pickup and delivery" | "Account";
  /** On for a new address until someone turns it off. */
  defaultOn: boolean;
  label: Record<NoticeSide, string>;
};

const BOTH = (shipper: string, carrier: string): Record<NoticeSide, string> => ({ shipper, carrier });
const ONE = (side: NoticeSide, label: string): Record<NoticeSide, string> =>
  side === "shipper" ? { shipper: label, carrier: label } : { shipper: label, carrier: label };

export const NOTICE_EVENTS: NoticeEventDef[] = [
  {
    event: NotificationEvent.LOAD_BOOKED,
    audience: "both",
    group: "Booking and bids",
    defaultOn: true,
    label: BOTH("A carrier booked your load", "Your company booked a load"),
  },
  {
    event: NotificationEvent.BID_SUBMITTED,
    audience: "shipper",
    group: "Booking and bids",
    defaultOn: true,
    label: ONE("shipper", "A carrier submitted a bid"),
  },
  {
    event: NotificationEvent.BID_ACCEPTED,
    audience: "carrier",
    group: "Booking and bids",
    defaultOn: true,
    label: ONE("carrier", "Your bid was accepted"),
  },
  {
    event: NotificationEvent.BID_DECLINED,
    audience: "carrier",
    group: "Booking and bids",
    defaultOn: true,
    label: ONE("carrier", "Your bid was declined"),
  },
  {
    event: NotificationEvent.BID_EXPIRED,
    audience: "carrier",
    group: "Booking and bids",
    defaultOn: false,
    label: ONE("carrier", "Your bid or counter expired"),
  },
  {
    event: NotificationEvent.COUNTER_SUBMITTED,
    audience: "shipper",
    group: "Booking and bids",
    defaultOn: true,
    label: ONE("shipper", "A carrier submitted a counter"),
  },
  {
    event: NotificationEvent.COUNTER_ACCEPTED,
    audience: "carrier",
    group: "Booking and bids",
    defaultOn: true,
    label: ONE("carrier", "Your counter was accepted"),
  },
  {
    event: NotificationEvent.COUNTER_DECLINED,
    audience: "carrier",
    group: "Booking and bids",
    defaultOn: true,
    label: ONE("carrier", "Your counter was declined"),
  },
  {
    event: NotificationEvent.LOAD_CANCELLED,
    audience: "both",
    group: "Booking and bids",
    defaultOn: true,
    label: BOTH("A load was cancelled", "A booked load was cancelled"),
  },
  {
    event: NotificationEvent.DATE_CHANGE_REQUESTED,
    audience: "shipper",
    group: "Dates",
    defaultOn: true,
    label: ONE("shipper", "A carrier requested a date change"),
  },
  {
    event: NotificationEvent.DATE_CHANGE_APPROVED,
    audience: "carrier",
    group: "Dates",
    defaultOn: true,
    label: ONE("carrier", "Date change approved"),
  },
  {
    event: NotificationEvent.DATE_CHANGE_DECLINED,
    audience: "carrier",
    group: "Dates",
    defaultOn: true,
    label: ONE("carrier", "Date change declined"),
  },
  {
    event: NotificationEvent.SUPPLIER_DATES_CHANGED,
    audience: "carrier",
    group: "Dates",
    defaultOn: true,
    label: ONE("carrier", "Supplier changed the dates"),
  },
  {
    event: NotificationEvent.LOAD_DETAILS_CHANGED,
    audience: "carrier",
    group: "Dates",
    defaultOn: false,
    label: ONE("carrier", "Supplier changed the load"),
  },
  {
    event: NotificationEvent.LOAD_PICKED_UP,
    audience: "shipper",
    group: "Pickup and delivery",
    defaultOn: true,
    label: ONE("shipper", "Load picked up"),
  },
  {
    event: NotificationEvent.LOAD_DELIVERED,
    audience: "shipper",
    group: "Pickup and delivery",
    defaultOn: true,
    label: ONE("shipper", "Carrier marked the load delivered"),
  },
  {
    event: NotificationEvent.DELIVERY_CONFIRMED,
    audience: "carrier",
    group: "Pickup and delivery",
    defaultOn: true,
    label: ONE("carrier", "Supplier confirmed delivery"),
  },
  {
    event: NotificationEvent.FIRM_RATE_EXPIRED,
    audience: "shipper",
    group: "Account",
    defaultOn: false,
    label: ONE("shipper", "Firm Rate load needs a repost"),
  },
  {
    event: NotificationEvent.BID_WINDOW_ENDED,
    audience: "shipper",
    group: "Account",
    defaultOn: false,
    label: ONE("shipper", "Open bid window ended"),
  },
  {
    event: NotificationEvent.LOAD_REMOVED,
    audience: "shipper",
    group: "Account",
    defaultOn: false,
    label: ONE("shipper", "Load removed after two bid cycles"),
  },
  {
    event: NotificationEvent.INSURANCE_EXPIRING,
    audience: "carrier",
    group: "Account",
    defaultOn: false,
    label: ONE("carrier", "Insurance on file is expiring"),
  },
  {
    event: NotificationEvent.ACCOUNT_APPROVED,
    audience: "both",
    group: "Account",
    defaultOn: false,
    label: BOTH("Company approved", "Company approved"),
  },
  {
    event: NotificationEvent.ACCOUNT_NEEDS_ATTENTION,
    audience: "both",
    group: "Account",
    defaultOn: false,
    label: BOTH("Company was not approved", "Company was not approved"),
  },
];

const BY_EVENT = new Map(NOTICE_EVENTS.map((row) => [row.event, row]));

export function noticeEventDef(event: NotificationEvent): NoticeEventDef {
  const row = BY_EVENT.get(event);
  if (!row) throw new Error(`Unknown notification event ${event}`);
  return row;
}

export function defaultEnabled(event: NotificationEvent): boolean {
  return noticeEventDef(event).defaultOn;
}

export function eventVisibleTo(event: NotificationEvent, side: NoticeSide): boolean {
  const audience = noticeEventDef(event).audience;
  return audience === "both" || audience === side;
}

export function eventsForSide(side: NoticeSide): NoticeEventDef[] {
  return NOTICE_EVENTS.filter((row) => eventVisibleTo(row.event, side));
}

export function eventsForCompany(flags: { supplierKind: string | null; carrierType: string | null }): NoticeEventDef[] {
  const shipper = flags.supplierKind != null;
  const carrier = flags.carrierType != null;
  if (shipper && carrier) return NOTICE_EVENTS;
  if (carrier) return eventsForSide("carrier");
  return eventsForSide("shipper");
}

export function labelForCompany(
  event: NotificationEvent,
  flags: { supplierKind: string | null; carrierType: string | null },
): string {
  const def = noticeEventDef(event);
  const shipper = flags.supplierKind != null;
  const carrier = flags.carrierType != null;
  if (carrier && !shipper) return def.label.carrier;
  if (shipper && !carrier) return def.label.shipper;
  if (def.label.shipper === def.label.carrier) return def.label.shipper;
  return `${def.label.shipper} / ${def.label.carrier}`;
}

export function companyMatchesEvent(
  event: NotificationEvent,
  flags: { supplierKind: string | null; carrierType: string | null },
): boolean {
  const shipper = flags.supplierKind != null;
  const carrier = flags.carrierType != null;
  if (shipper && eventVisibleTo(event, "shipper")) return true;
  if (carrier && eventVisibleTo(event, "carrier")) return true;
  if (!shipper && !carrier) return eventVisibleTo(event, "shipper");
  return false;
}
