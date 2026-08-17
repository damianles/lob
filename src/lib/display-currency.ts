import type { OfferCurrencyCode } from "@/lib/money";

export type DisplayCurrency = OfferCurrencyCode;

/** Cookie readable on the server (Insights) and written from the client preference. */
export const DISPLAY_CURRENCY_COOKIE = "lob-display-currency";

export const DISPLAY_CURRENCY_STORAGE_KEY = "lob-display-currency";

export function parseDisplayCurrency(raw: string | null | undefined): DisplayCurrency {
  return raw === "USD" ? "USD" : "CAD";
}

export function writeDisplayCurrencyCookie(ccy: DisplayCurrency): void {
  document.cookie = `${DISPLAY_CURRENCY_COOKIE}=${ccy}; Path=/; Max-Age=31536000; SameSite=Lax`;
}
