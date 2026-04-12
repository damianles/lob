import type { ShipperVisibilityActor } from "@/lib/shipper-visibility";

type LoadWithBooking = {
  shipperCompanyId: string;
  booking: null | { carrierCompanyId: string };
};

/**
 * Carrier legal name is hidden on the open market: only the posting supplier, the booked carrier,
 * and admins may see who booked. Others see status "Booked" only.
 */
export function carrierCompanyNameForViewer(
  legalName: string,
  load: LoadWithBooking,
  actor: ShipperVisibilityActor,
): string | null {
  if (!load.booking) return null;
  if (actor.role === "ADMIN") return legalName;
  if (actor.role === "SHIPPER" && actor.companyId && actor.companyId === load.shipperCompanyId) {
    return legalName;
  }
  if (
    actor.companyId &&
    (actor.role === "DISPATCHER" || actor.role === "DRIVER") &&
    load.booking.carrierCompanyId === actor.companyId
  ) {
    return legalName;
  }
  return null;
}
