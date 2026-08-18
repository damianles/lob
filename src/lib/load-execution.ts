/**
 * Supplier-entered stop and reference details live on Load.extendedPosting
 * (pickups/deliveries arrays, ship ref / PO). Used on dispatch sheets and
 * facility pages — not first-class Load columns.
 */

export type LoadStopDetail = {
  index: number;
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
  const address = str(r.address);
  const postal = str(r.postal);
  const phone = str(r.phone);
  const date = str(r.date);
  const time = str(r.time);
  const window = str(r.window);
  const appointment = str(r.appointment);
  if (!address && !postal && !phone && !date && !time && !window && !appointment) return null;
  return { index, address, postal, phone, date, time, window, appointment };
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

export function formatStopBlock(stop: LoadStopDetail): string[] {
  const lines: string[] = [];
  if (stop.address) lines.push(stop.address);
  if (stop.postal && (!stop.address || !stop.address.toUpperCase().includes(stop.postal.toUpperCase()))) {
    lines.push(stop.postal);
  }
  if (stop.phone) lines.push(`Tel ${stop.phone}`);
  const extra = [stop.window && `Window: ${stop.window}`, stop.appointment && `Appt: ${stop.appointment}`].filter(
    Boolean,
  ) as string[];
  if (extra.length) lines.push(extra.join(" · "));
  return lines;
}
