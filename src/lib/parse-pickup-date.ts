/** Accepts YYYY-MM-DD or full ISO; returns UTC Date. */
export function parseRequestedPickupAt(input: string): Date | null {
  const s = input.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return new Date(`${s}T12:00:00.000Z`);
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}
