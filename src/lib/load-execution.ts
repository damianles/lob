/**
 * Supplier-entered stop and reference details live on Load.extendedPosting
 * (pickups/deliveries arrays, ship ref / PO). Used on dispatch sheets and
 * facility pages — not first-class Load columns.
 */

export type LoadStopDetail = {
  index: number;
  /** Mill yard, warehouse, or receiving company at this stop. */
  companyName: string | null;
  address: string | null;
  postal: string | null;
  phone: string | null;
  date: string | null;
  time: string | null;
  window: string | null;
  appointment: string | null;
};

export type LoadExecutionDetails = {
  shipRef: string | null;
  customerOrderNo: string | null;
  poNumber: string | null;
  customerName: string | null;
  pickups: LoadStopDetail[];
  deliveries: LoadStopDetail[];
  pickupNotes: string | null;
  deliveryNotes: string | null;
  notes: string | null;
  ftlLtl: string | null;
};

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function str(v: unknown): string | null {
  if (typeof v === "string" && v.trim()) return v.trim();
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return null;
}

function parseStop(raw: unknown, index: number): LoadStopDetail | null {
  const r = asRecord(raw);
  if (!r) return null;
  const companyName = str(r.companyName);
  const address = str(r.address);
  const postal = str(r.postal);
  const phone = str(r.phone);
  const date = str(r.date);
  const time = str(r.time);
  const window = str(r.window);
  const appointment = str(r.appointment);
  if (!companyName && !address && !postal && !phone && !date && !time && !window && !appointment) {
    return null;
  }
  return { index, companyName, address, postal, phone, date, time, window, appointment };
}

function parseStops(raw: unknown): LoadStopDetail[] {
  if (!Array.isArray(raw)) return [];
  const out: LoadStopDetail[] = [];
  raw.forEach((item, i) => {
    const stop = parseStop(item, i + 1);
    if (stop) out.push(stop);
  });
  return out;
}

export function extractLoadExecution(extendedPosting: unknown): LoadExecutionDetails {
  const ext = asRecord(extendedPosting);
  const req = ext ? asRecord(ext.loadRequirements) : null;
  return {
    shipRef: ext ? str(ext.shipRef) : null,
    customerOrderNo: ext ? str(ext.customerOrderNo) : null,
    poNumber: ext ? str(ext.poNumber) : null,
    customerName: ext ? str(ext.customerName) : null,
    pickups: ext ? parseStops(ext.pickups) : [],
    deliveries: ext ? parseStops(ext.deliveries) : [],
    pickupNotes: req ? str(req.pickupNotes) : null,
    deliveryNotes: req ? str(req.deliveryNotes) : null,
    notes: ext ? str(ext.notes) : null,
    ftlLtl: ext ? str(ext.ftlLtl) : null,
  };
}

export function firstStopTime(stops: LoadStopDetail[]): string | null {
  for (const s of stops) {
    if (s.time) return s.time;
  }
  return null;
}

function compactAlnum(s: string): string {
  return s.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** True when `needle` is already present in `haystack` (ignores spaces/punctuation). */
function alreadyContains(haystack: string, needle: string): boolean {
  const n = compactAlnum(needle);
  if (n.length < 3) return false;
  return compactAlnum(haystack).includes(n);
}

function pushUnique(lines: string[], next: string | null | undefined) {
  const t = next?.trim();
  if (!t) return;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (alreadyContains(t, lines[i]) && compactAlnum(t) !== compactAlnum(lines[i])) {
      lines.splice(i, 1);
    }
  }
  if (lines.some((e) => alreadyContains(e, t))) return;
  lines.push(t);
}

export function formatCityLine(city: string, state: string, zip: string): string {
  const place = [city.trim(), state.trim()].filter(Boolean);
  const left = place.length >= 2 ? `${place[0]}, ${place[1]}` : place[0] ?? "";
  return [left, zip.trim()].filter(Boolean).join(" ");
}

/**
 * One clean pickup/delivery block: company, street, city + postal, phone, window.
 * Labels use Pickup Location / Delivery Location (never "Stop").
 */
export function formatLocationLines(
  cityLine: string,
  stops: LoadStopDetail[],
  kind: "pickup" | "delivery" = "pickup",
): string[] {
  const lines: string[] = [];
  if (!stops.length) {
    pushUnique(lines, cityLine);
    return lines;
  }

  const placeLabel = kind === "pickup" ? "Pickup Location" : "Delivery Location";

  stops.forEach((stop) => {
    const block: string[] = [];
    pushUnique(block, stop.companyName);
    pushUnique(block, stop.address);
    if (stop.index === 1) pushUnique(block, cityLine);
    pushUnique(block, stop.postal);
    pushUnique(block, stop.phone);
    const more = [
      stop.window && `Window: ${stop.window}`,
      stop.appointment && `Appt: ${stop.appointment}`,
    ].filter(Boolean) as string[];
    for (const m of more) pushUnique(block, m);
    if (!block.length) return;
    lines.push(`${placeLabel} ${stop.index}: ${block.join(" · ")}`);
  });

  return lines;
}
