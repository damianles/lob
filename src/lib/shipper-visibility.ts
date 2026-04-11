import type { SupplierKind } from "@prisma/client";

/** Who may see mill / shipper legal name on a load (privacy: hidden from marketplace until your carrier books). */

export type ShipperVisibilityActor = {
  companyId: string | null;
  role: string | null;
};

export type ShipperVisibilityLoad = {
  shipperCompanyId: string;
  booking: null | { carrierCompanyId: string };
};

const supplierKindLabels: Record<SupplierKind, string> = {
  MILL: "Mill",
  WHOLESALER: "Wholesaler",
  OTHER: "Supplier",
};

export function supplierKindLabel(kind: SupplierKind): string {
  return supplierKindLabels[kind];
}

export function shipperCompanyNameForViewer(
  legalName: string,
  load: ShipperVisibilityLoad,
  actor: ShipperVisibilityActor,
): string | null {
  if (actor.role === "ADMIN") return legalName;
  if (actor.role === "SHIPPER" && actor.companyId && actor.companyId === load.shipperCompanyId) {
    return legalName;
  }
  if (
    actor.companyId &&
    (actor.role === "DISPATCHER" || actor.role === "DRIVER") &&
    load.booking &&
    load.booking.carrierCompanyId === actor.companyId
  ) {
    return legalName;
  }
  return null;
}

/** Same rules as shipper name: carriers only see supplier type after they have booked this load. */
export function supplierKindForViewer(
  kind: SupplierKind | null,
  load: ShipperVisibilityLoad,
  actor: ShipperVisibilityActor,
): SupplierKind | null {
  if (!kind) return null;
  if (actor.role === "ADMIN") return kind;
  if (actor.role === "SHIPPER" && actor.companyId && actor.companyId === load.shipperCompanyId) {
    return kind;
  }
  if (
    actor.companyId &&
    (actor.role === "DISPATCHER" || actor.role === "DRIVER") &&
    load.booking &&
    load.booking.carrierCompanyId === actor.companyId
  ) {
    return kind;
  }
  return null;
}
