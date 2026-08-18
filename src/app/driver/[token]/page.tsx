import { notFound } from "next/navigation";

import { DispatchSheetPrint } from "@/components/dispatch-sheet-print";
import { parseDriverPacket } from "@/lib/driver-packet";
import { extractLumberSpec } from "@/lib/lumber-spec";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function DriverPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const dispatch = await prisma.dispatchLink.findUnique({
    where: { token },
    include: {
      load: {
        include: {
          shipperCompany: { select: { legalName: true } },
          booking: { include: { carrierCompany: { select: { legalName: true } } } },
        },
      },
      podDocument: true,
    },
  });

  if (!dispatch) {
    notFound();
  }

  const expired = dispatch.expiresAt < new Date();
  const packet = parseDriverPacket(dispatch.driverPacket);
  const lumberSpec = extractLumberSpec(dispatch.load.extendedPosting);
  const millName = packet.include.shipperName ? dispatch.load.shipperCompany.legalName : null;
  const carrierName = dispatch.load.booking?.carrierCompany.legalName ?? null;

  return (
    <main className="min-h-screen bg-stone-100 print:bg-white">
      {expired ? (
        <p className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-950">
          This driver link has expired. Ask your dispatcher for a new one.
        </p>
      ) : null}
      <DispatchSheetPrint
        referenceNumber={dispatch.load.referenceNumber}
        originLine={`${dispatch.load.originCity}, ${dispatch.load.originState} ${dispatch.load.originZip}`}
        destinationLine={`${dispatch.load.destinationCity}, ${dispatch.load.destinationState} ${dispatch.load.destinationZip}`}
        weightLbs={dispatch.load.weightLbs}
        equipmentType={dispatch.load.equipmentType}
        millLabel={millName}
        carrierName={carrierName}
        driverName={dispatch.driverName}
        driverPhone={dispatch.driverPhone}
        pickupAt={dispatch.load.requestedPickupAt.toISOString()}
        deliveryAt={dispatch.load.requestedDeliveryAt?.toISOString() ?? null}
        pickupCode={dispatch.load.uniquePickupCode}
        lumberSpec={lumberSpec}
        packet={packet}
      />
      <section className="mx-auto max-w-[8.5in] px-6 pb-8 text-sm text-zinc-600 print:hidden">
        <p>
          Status: {dispatch.status}
          {" · "}
          Pickup confirmed: {dispatch.pickupConfirmedAt ? "Yes" : "No"}
          {" · "}
          Delivered: {dispatch.deliveredAt ? "Yes" : "No"}
        </p>
      </section>
    </main>
  );
}
