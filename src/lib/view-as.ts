/**
 * Admin "view-as" — lets LOB admins inspect the app as a Supplier or Carrier.
 * Useful for UX evaluation without juggling multiple test logins.
 *
 * Trust model:
 * - The cookie is read on the server by `getActorContext()` and ONLY honored
 *   when the *real* user is an ADMIN. A non-admin who hand-crafts this cookie
 *   gets no effect — there is no privilege escalation path.
 * - When simulating a supplier or carrier, `getActorContext()` attaches the seeded
 *   demo company (`North Ridge Lumber` / `Blue Ox Transport`) so shipper/carrier
 *   APIs work during UX previews. Requires `npm run db:seed` on the database.
 */

import type { CarrierBusinessType, SupplierKind } from "@/lib/viewer-role";

export const VIEW_AS_COOKIE = "lob.viewAs";

export type ViewAsRole = "SHIPPER" | "DISPATCHER" | "DRIVER" | "ADMIN";

export type ViewAsPayload = {
  role: ViewAsRole;
  supplierKind?: SupplierKind | null;
  carrierType?: CarrierBusinessType | null;
  isOwnerOperator?: boolean;
  verified?: boolean;
};

const ROLE_VALUES: ViewAsRole[] = ["SHIPPER", "DISPATCHER", "DRIVER", "ADMIN"];
const SUPPLIER_VALUES: SupplierKind[] = ["MILL", "WHOLESALER", "OTHER"];
const CARRIER_VALUES: CarrierBusinessType[] = ["ASSET_BASED", "BROKER"];

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function isViewAsPayload(v: unknown): v is ViewAsPayload {
  if (!isPlainObject(v)) return false;
  const role = v.role;
  if (typeof role !== "string" || !ROLE_VALUES.includes(role as ViewAsRole)) return false;

  if (v.supplierKind != null && (typeof v.supplierKind !== "string" ||
    !SUPPLIER_VALUES.includes(v.supplierKind as SupplierKind))) return false;
  if (v.carrierType != null && (typeof v.carrierType !== "string" ||
    !CARRIER_VALUES.includes(v.carrierType as CarrierBusinessType))) return false;
  if (v.isOwnerOperator != null && typeof v.isOwnerOperator !== "boolean") return false;
  if (v.verified != null && typeof v.verified !== "boolean") return false;
  return true;
}

/** Cookie value is base64url(JSON). Browser-safe, no HMAC (see trust model above). */
export function encodeViewAsCookie(payload: ViewAsPayload): string {
  const json = JSON.stringify(payload);
  if (typeof btoa === "function") {
    return btoa(unescape(encodeURIComponent(json)));
  }
  return Buffer.from(json, "utf-8").toString("base64");
}

export function decodeViewAsCookie(raw: string | null | undefined): ViewAsPayload | null {
  if (!raw) return null;
  try {
    let json: string;
    if (typeof atob === "function") {
      json = decodeURIComponent(escape(atob(raw)));
    } else {
      json = Buffer.from(raw, "base64").toString("utf-8");
    }
    const parsed: unknown = JSON.parse(json);
    return isViewAsPayload(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Pretty label for the simulated persona shown in chrome.
 *
 * Supplier and Carrier are the two marketplace personas. Mill vs wholesaler
 * and asset vs broker vs owner-op live on the company file, not as extra
 * View-as roles.
 */
export function viewAsLabel(p: ViewAsPayload): string {
  if (p.role === "ADMIN") return "Admin";
  if (p.role === "SHIPPER") return "Supplier";
  if (p.role === "DISPATCHER" || p.role === "DRIVER") return "Carrier";
  return "User";
}

/** Preset profiles surfaced in the admin picker — the canonical perspectives we care about. */
export const VIEW_AS_PRESETS: Array<{
  id: string;
  label: string;
  /** Circle badge letters: S / C */
  initials: string;
  /** Matches PersonaTone for accent colors in the picker. */
  tone: "supplier" | "carrier";
  hint: string;
  payload: ViewAsPayload;
}> = [
  {
    id: "supplier",
    label: "Supplier",
    initials: "S",
    tone: "supplier",
    hint: "Mill or wholesaler — one supplier-side product",
    payload: { role: "SHIPPER", verified: true },
  },
  {
    id: "carrier",
    label: "Carrier",
    initials: "C",
    tone: "carrier",
    hint: "Service provider — book, dispatch, and deliver. Type (asset / broker / owner-op) is company metadata.",
    payload: { role: "DISPATCHER", carrierType: "ASSET_BASED", verified: true },
  },
];

/** Circle badge classes for View-as picker (keep in sync with roleAccentClasses). */
export function viewAsInitialsClasses(tone: (typeof VIEW_AS_PRESETS)[number]["tone"]): string {
  switch (tone) {
    case "supplier":
      return "bg-lob-gold text-white";
    case "carrier":
      return "bg-sky-600 text-white";
  }
}

export function isViewAsPresetActive(
  preset: (typeof VIEW_AS_PRESETS)[number],
  viewer: {
    simulated: boolean;
    kind: string;
    carrierType: string | null;
    isOwnerOperator: boolean;
  },
): boolean {
  if (!viewer.simulated) return false;
  const p = preset.payload;
  if (p.role === "SHIPPER") return viewer.kind === "SHIPPER";
  if (p.role === "DISPATCHER" || p.role === "DRIVER") return viewer.kind === "CARRIER";
  return false;
}
