/**
 * Admin "view-as" — lets LOB admins inspect the app exactly the way a Mill,
 * Wholesaler, Asset Carrier, Broker, or Owner-operator would see it. Useful
 * for UX evaluation and design reviews without juggling multiple test logins.
 *
 * Trust model:
 * - The cookie is read on the server by `getActorContext()` and ONLY honored
 *   when the *real* user is an ADMIN. A non-admin who hand-crafts this cookie
 *   gets no effect — there is no privilege escalation path.
 * - The cookie only changes the UX layer (labels, ribbon color, role-aware
 *   filters, conditional links). It does NOT change `realCompanyId`, so all
 *   data-scoped queries continue to use the admin's true company access.
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
 * NOTE: "Supplier" is the single persona on the supplier side of the
 * marketplace — both mills and wholesalers experience the same product. The
 * mill-vs-wholesaler distinction lives on the account file (Company.supplierKind),
 * not as a separate persona in the View-as picker.
 */
export function viewAsLabel(p: ViewAsPayload): string {
  if (p.role === "ADMIN") return "Admin";
  if (p.role === "SHIPPER") return "Supplier";
  if (p.isOwnerOperator) return "Owner-operator";
  if (p.carrierType === "BROKER") return "Broker";
  if (p.carrierType === "ASSET_BASED") return "Asset Carrier";
  return p.role === "DISPATCHER" ? "Dispatcher" : "Driver";
}

/** Preset profiles surfaced in the admin picker — the canonical perspectives we care about. */
export const VIEW_AS_PRESETS: Array<{
  id: string;
  label: string;
  hint: string;
  payload: ViewAsPayload;
}> = [
  {
    id: "supplier",
    label: "Supplier",
    hint: "Mill or wholesaler — the supplier-side product is one persona",
    payload: { role: "SHIPPER", verified: true },
  },
  {
    id: "asset-carrier",
    label: "Asset Carrier",
    hint: "Dispatcher at an asset-based fleet",
    payload: { role: "DISPATCHER", carrierType: "ASSET_BASED", verified: true },
  },
  {
    id: "broker",
    label: "Broker",
    hint: "Freight brokerage dispatcher",
    payload: { role: "DISPATCHER", carrierType: "BROKER", verified: true },
  },
  {
    id: "owner-op",
    label: "Owner-operator",
    hint: "Single-truck owner-operator driver",
    payload: { role: "DRIVER", carrierType: "ASSET_BASED", isOwnerOperator: true, verified: true },
  },
];
