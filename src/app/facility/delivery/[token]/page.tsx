import { notFound } from "next/navigation";

import { FacilityLoadSummary } from "@/components/facility-load-summary";
import { facilityOpsFromDispatch } from "@/lib/facility-load-ops";
import { prisma } from "@/lib/prisma";

import { FacilityDeliveryForm } from "./facility-delivery-form";

export const dynamic = "force-dynamic";

const facilityDispatchInclude = {
  load: {
    select: {
      referenceNumber: true,
      originCity: true,
      originState: true,
      originZip: true,
      destinationCity: true,
      destinationState: true,
      destinationZip: true,
      weightLbs: true,
      equipmentType: true,
      requestedPickupAt: true,
      requestedDeliveryAt: true,
      booking: {
        select: {
          carrierCompany: { select: { legalName: true } },
        },
      },
    },
  },
} as const;

export default async function FacilityDeliveryPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const dispatch = await prisma.dispatchLink.findUnique({
    where: { token },
    include: facilityDispatchInclude,
  });
  if (!dispatch) notFound();

  const ops = facilityOpsFromDispatch(dispatch);

  return (
    <main className="mx-auto min-h-[calc(100vh-3.5rem)] max-w-lg bg-zinc-50 px-4 py-10">
      <h1 className="text-xl font-bold text-zinc-900">LOB · Delivery confirmation</h1>
      <p className="mt-2 text-sm text-zinc-600">
        No LOB account required. Use the link or office QR from the shipper — not the driver&apos;s paperwork. Pricing
        is not shown on this page.
      </p>
      <FacilityLoadSummary ops={ops} />
      <FacilityDeliveryForm token={dispatch.token} referenceNumber={dispatch.load.referenceNumber} />
    </main>
  );
}
