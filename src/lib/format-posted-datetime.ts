/**
 * Posted pickup/delivery are calendar dates, stored at noon UTC so the day
 * does not shift across North American timezones. Never invent a clock time
 * from that storage convention — 5:00 AM / 6:00 AM is a timezone artifact.
 */

const DATE_ONLY_UTC: Intl.DateTimeFormatOptions = {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
};

function asDate(input: Date | string | null | undefined): Date | null {
  if (input == null || input === "") return null;
  const d = typeof input === "string" ? new Date(input) : input;
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Calendar date only (e.g. "Tue, Aug 25, 2026"). Null if missing/invalid. */
export function formatPostedDate(input: Date | string | null | undefined): string | null {
  const d = asDate(input);
  if (!d) return null;
  return new Intl.DateTimeFormat("en-US", DATE_ONLY_UTC).format(d);
}

/**
 * Date plus a supplier-entered clock time (from stop `time`), if they typed one.
 * Does not format the stored Date's hours.
 */
export function formatPostedDateWithOptionalTime(
  input: Date | string | null | undefined,
  time?: string | null,
): string | null {
  const date = formatPostedDate(input);
  const t = typeof time === "string" ? time.trim() : "";
  if (!date && !t) return null;
  if (date && t) return `${date}, ${t}`;
  return date ?? t;
}

/** Real timestamps (booked-at, generated-at) — include clock time. */
export function formatInstant(input: Date | string | null | undefined): string | null {
  const d = asDate(input);
  if (!d) return null;
  return d.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
