import type { ShipperVisibilityActor } from "@/lib/shipper-visibility";

type LoadWithBooking = {
  shipperCompanyId: string;
  booking: null | { carrierCompanyId: string };
};

/**
 * On booked loads, carrier legal name is visible to the posting supplier, the booked carrier,
 * and admins. Other marketplace viewers still see status only.
 * Open Capacity is separate: suppliers see carrier company names there by design.
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
