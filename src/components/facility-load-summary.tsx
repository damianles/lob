import { equipmentShortTag } from "@/lib/lumber-equipment";
import { formatPostedDateWithOptionalTime } from "@/lib/format-posted-datetime";
import {
  extractLoadExecution,
  firstStopTime,
  formatLocationLines,
} from "@/lib/load-execution";

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
  extendedPosting?: unknown;
};

export function FacilityLoadSummary({ ops }: { ops: FacilityLoadOps }) {
  const execution = extractLoadExecution(ops.extendedPosting);
  const pickupWhen = formatPostedDateWithOptionalTime(ops.requestedPickupAt, firstStopTime(execution.pickups));
  const deliveryWhen = formatPostedDateWithOptionalTime(ops.requestedDeliveryAt, firstStopTime(execution.deliveries));

  return (
    <section className="mt-4 rounded-xl border border-stone-200 bg-white p-4 text-sm shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">Shipment (no pricing)</p>
      <dl className="mt-3 space-y-2 text-zinc-800">
        <div>
          <dt className="text-xs text-zinc-500">Reference</dt>
          <dd className="font-semibold">{ops.referenceNumber}</dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">Pickup</dt>
          <dd>
            {pickupWhen ? <span className="block text-zinc-600">{pickupWhen}</span> : null}
            {formatLocationLines(ops.originLine, execution.pickups).map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">Delivery</dt>
          <dd>
            {deliveryWhen ? <span className="block text-zinc-600">{deliveryWhen}</span> : null}
            {formatLocationLines(ops.destinationLine, execution.deliveries).map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
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
        {ops.carrierName ? (
          <div>
            <dt className="text-xs text-zinc-500">Carrier</dt>
            <dd>{ops.carrierName}</dd>
          </div>
        ) : null}
        {ops.driverName || ops.driverPhone ? (
          <div>
            <dt className="text-xs text-zinc-500">Driver</dt>
            <dd>
              {ops.driverName ?? "Assigned"}
              {ops.driverPhone ? ` · ${ops.driverPhone}` : ""}
            </dd>
          </div>
        ) : null}
      </dl>
    </section>
  );
}
