import { Suspense } from "react";

import { FacilityLoadSummary } from "@/components/facility-load-summary";
import { facilityOpsFromDispatch } from "@/lib/facility-load-ops";
import { prisma } from "@/lib/prisma";

import { FacilityPickupForm } from "./facility-pickup-form";

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
      extendedPosting: true,
      booking: {
        select: {
          carrierCompany: { select: { legalName: true } },
        },
      },
    },
  },
} as const;

export default async function FacilityPickupPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const dispatch = await prisma.dispatchLink.findUnique({
    where: { token },
    include: facilityDispatchInclude,
  });
  if (!dispatch) {
    return (
      <main className="mx-auto min-h-[calc(100vh-3.5rem)] max-w-lg px-4 py-10 text-zinc-900">
        <h1 className="text-xl font-bold">Pickup link not found</h1>
        <p className="mt-2 text-sm text-zinc-600">
          This QR or URL is invalid, or a driver dispatch has not been created for this load yet. Open the load in LOB
          and use Confirm Pickup after dispatch exists.
        </p>
      </main>
    );
  }

  const ops = facilityOpsFromDispatch(dispatch);

  return (
    <main className="mx-auto min-h-[calc(100vh-3.5rem)] max-w-lg overflow-x-hidden bg-stone-50 px-3 py-8 sm:px-4 sm:py-10">
      <h1 className="text-xl font-bold tracking-tight text-zinc-900">LOB · Pickup confirmation</h1>
      <p className="mt-2 text-sm text-zinc-600 leading-relaxed break-words">
        No LOB account required. For pickup yards — confirm when freight is loaded. Pricing is not shown on this page.
      </p>
      <FacilityLoadSummary ops={ops} />
      <Suspense
        fallback={
          <div className="mt-6 h-32 animate-pulse rounded-2xl border border-stone-200 bg-stone-100" aria-hidden />
        }
      >
        <FacilityPickupForm token={dispatch.token} referenceNumber={dispatch.load.referenceNumber} />
      </Suspense>
    </main>
  );
}
