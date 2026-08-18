export type LoadRateMode = "TAKE_IT" | "OPEN_BID";
export type LoadBidKind = "BID" | "COUNTER";

export const RATE_MODE_TAKE_IT = "TAKE_IT" as const;
export const RATE_MODE_OPEN_BID = "OPEN_BID" as const;

/** Customer-facing name for a firm posted rate. */
export const TAKE_IT_LABEL = "Take-it";
export const OPEN_BID_LABEL = "Open bid";

export function rateModeLabel(mode: LoadRateMode | string | null | undefined): string {
  if (mode === "OPEN_BID") return OPEN_BID_LABEL;
  return TAKE_IT_LABEL;
}

export function rateModeHint(mode: LoadRateMode, allowCounters: boolean): string {
  if (mode === "OPEN_BID") {
    return "Carriers submit bids. You accept one before the window closes — no instant book.";
  }
  if (allowCounters) {
    return `Posted ${TAKE_IT_LABEL} rate. Carriers can book it as-is or send a counter.`;
  }
  return `Posted ${TAKE_IT_LABEL} rate. This is the pay rate — no negotiations.`;
}

export function bidKindLabel(kind: LoadBidKind | string): string {
  return kind === "COUNTER" ? "Counter" : "Bid";
}

export const BID_WINDOW_PRESETS_HOURS = [4, 8, 12, 24, 48, 72] as const;

export function formatBidWindowHours(hours: number): string {
  if (hours < 24) return `${hours}h`;
  if (hours % 24 === 0) {
    const d = hours / 24;
    return d === 1 ? "1 day" : `${d} days`;
  }
  return `${hours}h`;
}

export function computeBidWindowExpiresAt(args: {
  now?: Date;
  pickupAt: Date;
  bidUntilPickup: boolean;
  bidWindowHours?: number | null;
}): Date {
  const now = args.now ?? new Date();
  if (args.bidUntilPickup) return args.pickupAt;
  const hours = args.bidWindowHours && args.bidWindowHours > 0 ? args.bidWindowHours : 24;
  return new Date(now.getTime() + hours * 60 * 60 * 1000);
}
