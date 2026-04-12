/** Format whole-dollar amounts for North American display. */
export function formatMoney(amount: number | null | undefined, currency: "USD" | "CAD"): string {
  if (amount == null || !Number.isFinite(amount)) return "—";
  const locale = currency === "CAD" ? "en-CA" : "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
