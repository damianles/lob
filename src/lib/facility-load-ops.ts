import type { FacilityLoadOps } from "@/components/facility-load-summary";

type DispatchRow = {
  driverName: string;
  driverPhone: string | null;
  load: {
    referenceNumber: string;
    originCity: string;
    originState: string;
    originZip: string;
    destinationCity: string;
    destinationState: string;
    destinationZip: string;
    weightLbs: number;
    equipmentType: string;
    requestedPickupAt: Date | null;
    requestedDeliveryAt: Date | null;
    booking: { carrierCompany: { legalName: string } } | null;
  };
};

export function facilityOpsFromDispatch(dispatch: DispatchRow): FacilityLoadOps {
  const l = dispatch.load;
  return {
    referenceNumber: l.referenceNumber,
    originLine: `${l.originCity}, ${l.originState} ${l.originZip}`,
    destinationLine: `${l.destinationCity}, ${l.destinationState} ${l.destinationZip}`,
    weightLbs: l.weightLbs,
    equipmentType: l.equipmentType,
    carrierName: l.booking?.carrierCompany.legalName ?? null,
    driverName: dispatch.driverName,
    driverPhone: dispatch.driverPhone,
    requestedPickupAt: l.requestedPickupAt,
    requestedDeliveryAt: l.requestedDeliveryAt,
  };
}
