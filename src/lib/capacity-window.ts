/** Maximum inclusive calendar days between availableFrom and availableUntil. */
export const MAX_CAPACITY_RANGE_DAYS = 5;

export function validateCapacityAvailabilityWindow(availableFrom: Date, availableUntil: Date): string | null {
  const start = Date.UTC(
    availableFrom.getUTCFullYear(),
    availableFrom.getUTCMonth(),
    availableFrom.getUTCDate(),
  );
  const end = Date.UTC(
    availableUntil.getUTCFullYear(),
    availableUntil.getUTCMonth(),
    availableUntil.getUTCDate(),
  );
  if (end < start) {
    return "The last available day must be on or after the first day.";
  }
  const inclusiveDays = (end - start) / 86400000 + 1;
  if (inclusiveDays > MAX_CAPACITY_RANGE_DAYS) {
    return `Availability cannot span more than ${MAX_CAPACITY_RANGE_DAYS} calendar days (inclusive).`;
  }
  return null;
}

export function parseDateInputToUtc(dateStr: string, endOfDay: boolean): Date | null {
  const trimmed = dateStr.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const [y, m, d] = trimmed.split("-").map(Number);
  if (!y || !m || !d) return null;
  if (endOfDay) {
    return new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
  }
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
}
