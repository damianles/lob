/** Who may see mill / shipper legal name on a load (privacy: hidden from marketplace until your carrier books). */

export type ShipperVisibilityActor = {
  companyId: string | null;
  role: string | null;
};

export type ShipperVisibilityLoad = {
  shipperCompanyId: string;
  booking: null | { carrierCompanyId: string };
};

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
