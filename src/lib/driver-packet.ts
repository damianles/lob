/**
 * Carrier-chosen fields for the driver haul sheet / driver link.
 * Rate is never part of this packet — board rates stay off driver paperwork.
 */

export const DRIVER_PACKET_FIELD_IDS = [
  "lane",
  "dates",
  "equipment",
  "weight",
  "lumber",
  "shipperName",
  "pickupCode",
  "carrierName",
] as const;

export type DriverPacketFieldId = (typeof DRIVER_PACKET_FIELD_IDS)[number];

export type DriverPacketInclude = Record<DriverPacketFieldId, boolean>;

export type DriverPacket = {
  include: DriverPacketInclude;
  notes: string;
};

export const DRIVER_PACKET_FIELD_LABELS: Record<DriverPacketFieldId, { label: string; hint: string }> = {
  lane: { label: "Lane (origin → destination)", hint: "Always sent — drivers need the route." },
  dates: { label: "Pickup & delivery dates", hint: "Requested pickup and expected delivery." },
  equipment: { label: "Equipment", hint: "Trailer type (Super B, tri-axle, etc.)." },
  weight: { label: "Weight", hint: "Posted weight in pounds." },
  lumber: { label: "Product / lumber spec", hint: "Species, treatment, and other mill details." },
  shipperName: { label: "Shipper / mill name", hint: "Who posted the load (visible after booking)." },
  pickupCode: { label: "Pickup code", hint: "Usually for the yard — leave off unless the driver needs it." },
  carrierName: { label: "Your company name", hint: "Shown as the dispatching carrier." },
};

export const DEFAULT_DRIVER_PACKET_INCLUDE: DriverPacketInclude = {
  lane: true,
  dates: true,
  equipment: true,
  weight: true,
  lumber: true,
  shipperName: true,
  pickupCode: false,
  carrierName: true,
};

export function defaultDriverPacket(): DriverPacket {
  return { include: { ...DEFAULT_DRIVER_PACKET_INCLUDE }, notes: "" };
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function parseDriverPacket(raw: unknown): DriverPacket {
  const base = defaultDriverPacket();
  if (!isPlainObject(raw)) return base;

  const includeSrc = isPlainObject(raw.include) ? raw.include : raw;
  const include = { ...DEFAULT_DRIVER_PACKET_INCLUDE };
  for (const id of DRIVER_PACKET_FIELD_IDS) {
    if (id === "lane") {
      include.lane = true;
      continue;
    }
    if (typeof includeSrc[id] === "boolean") {
      include[id] = includeSrc[id];
    }
  }

  const notes = typeof raw.notes === "string" ? raw.notes.trim().slice(0, 800) : "";
  return { include, notes };
}

export function normalizeDriverPacketInput(raw: unknown): DriverPacket {
  return parseDriverPacket(raw);
}
