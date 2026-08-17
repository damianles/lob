export type OfferCurrencyCode = "USD" | "CAD";

/** Fallback when `LOB_CAD_TO_USD_RATE` is unset. Spreadsheet CAD lanes were stored at this rate. */
export const DEFAULT_CAD_TO_USD_RATE = 0.73;

export function cadToUsdRate(): number {
  const raw = process.env.LOB_CAD_TO_USD_RATE ?? process.env.NEXT_PUBLIC_LOB_CAD_TO_USD_RATE;
  const n = raw != null ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_CAD_TO_USD_RATE;
}

/** Format whole-dollar amounts for North American display. */
export function formatMoney(amount: number | null | undefined, currency: OfferCurrencyCode): string {
  if (amount == null || !Number.isFinite(amount)) return "—";
  const locale = currency === "CAD" ? "en-CA" : "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function convertMoney(amount: number, from: OfferCurrencyCode, to: OfferCurrencyCode): number {
  if (from === to) return amount;
  const r = cadToUsdRate();
  return from === "CAD" ? amount * r : amount / r;
}

export function formatMoneyIn(
  amount: number | null | undefined,
  native: OfferCurrencyCode,
  display: OfferCurrencyCode,
): string {
  if (amount == null || !Number.isFinite(amount)) return "—";
  return formatMoney(convertMoney(amount, native, display), display);
}

/**
 * Historical `market-benchmarks.json` stores CAD domestic lanes as a USD equivalent
 * (CAD × 0.73). Convert that stored USD figure into the lane's native currency.
 */
export function spreadsheetUsdEquivalentToNative(
  usdStored: number,
  native: OfferCurrencyCode,
): number {
  if (native === "USD") return usdStored;
  return usdStored / cadToUsdRate();
}
