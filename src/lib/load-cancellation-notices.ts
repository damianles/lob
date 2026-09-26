import { LoadStatus, type Prisma } from "@prisma/client";

import { queueCarrierLoadNotices, queueShipperLoadAlerts } from "@/lib/platform-notices";

type Db = Prisma.TransactionClient;

function laneLabel(load: {
  originCity: string;
  originState: string;
  destinationCity: string;
  destinationState: string;
}) {
  return `${load.originCity}, ${load.originState} → ${load.destinationCity}, ${load.destinationState}`;
}

/**
 * Notify the mill and (if booked) the carrier that a load was cancelled.
 * Email copies are stored PENDING — no SMTP send.
 */
export async function queueLoadCancellationNotices(
  db: Db,
  load: {
    id: string;
    referenceNumber: string;
    status: LoadStatus;
    shipperCompanyId: string;
    originCity: string;
    originState: string;
    destinationCity: string;
    destinationState: string;
    booking: { carrierCompanyId: string } | null;
  },
) {
  const lane = laneLabel(load);
  const hadBooking =
    Boolean(load.booking?.carrierCompanyId) &&
    (load.status === LoadStatus.BOOKED || load.status === LoadStatus.ASSIGNED);

  await queueShipperLoadAlerts(db, {
    loadId: load.id,
    companyId: load.shipperCompanyId,
    kind: "LOAD_CANCELLED",
    title: hadBooking ? "Booked load cancelled" : "Load cancelled",
    body: hadBooking
      ? `${load.referenceNumber} (${lane}) was cancelled. The booked carrier has been notified in-app.`
      : `${load.referenceNumber} (${lane}) was cancelled and is off the board.`,
  });

  if (hadBooking && load.booking) {
    await queueCarrierLoadNotices(db, {
      loadId: load.id,
      carrierCompanyId: load.booking.carrierCompanyId,
      title: "Booked load cancelled",
      summary: `The supplier cancelled ${load.referenceNumber} (${lane}). This booking is no longer active.`,
      changes: { kind: "LOAD_CANCELLED", previousStatus: load.status },
    });
  }
}
