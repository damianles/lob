import { equipmentShortTag } from "@/lib/lumber-equipment";

export type FacilityLoadOps = {
  referenceNumber: string;
  originLine: string;
  destinationLine: string;
  weightLbs: number;
  equipmentType: string;
  carrierName: string | null;
  driverName: string | null;
  driverPhone: string | null;
  requestedPickupAt: Date | null;
  requestedDeliveryAt: Date | null;
};

function formatWhen(d: Date | null) {
  if (!d) return null;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function FacilityLoadSummary({ ops }: { ops: FacilityLoadOps }) {
  const pickupWhen = formatWhen(ops.requestedPickupAt);
  const deliveryWhen = formatWhen(ops.requestedDeliveryAt);

  return (
    <section className="mt-4 rounded-xl border border-stone-200 bg-white p-4 text-sm shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">Shipment (no pricing)</p>
      <dl className="mt-3 space-y-2 text-zinc-800">
        <div>
          <dt className="text-xs text-zinc-500">Reference</dt>
          <dd className="font-semibold">{ops.referenceNumber}</dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">Route</dt>
          <dd>
            {ops.originLine} → {ops.destinationLine}
          </dd>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-zinc-500">Equipment</dt>
            <dd>{equipmentShortTag(ops.equipmentType)}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Weight</dt>
            <dd>{ops.weightLbs.toLocaleString()} lb</dd>
          </div>
        </div>
        {pickupWhen && (
          <div>
            <dt className="text-xs text-zinc-500">Requested pickup</dt>
            <dd>{pickupWhen}</dd>
          </div>
        )}
        {deliveryWhen && (
          <div>
            <dt className="text-xs text-zinc-500">Requested delivery</dt>
            <dd>{deliveryWhen}</dd>
          </div>
        )}
        {ops.carrierName && (
          <div>
            <dt className="text-xs text-zinc-500">Carrier</dt>
            <dd>{ops.carrierName}</dd>
          </div>
        )}
        {(ops.driverName || ops.driverPhone) && (
          <div>
            <dt className="text-xs text-zinc-500">Driver</dt>
            <dd>
              {ops.driverName ?? "Assigned"}
              {ops.driverPhone ? ` · ${ops.driverPhone}` : ""}
            </dd>
          </div>
        )}
      </dl>
    </section>
  );
}
