import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { CompletionInvoicePrint } from "@/components/completion-invoice-print";
import { isShipmentMutuallyComplete } from "@/lib/confirm-load-delivery";
import { extractLumberSpec } from "@/lib/lumber-spec";
import { formatMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { getActorContext } from "@/lib/request-context";
import { syncClerkUserToDatabase } from "@/lib/sync-clerk-user";

export const dynamic = "force-dynamic";

export default async function CompletionInvoicePage({ params }: { params: Promise<{ loadId: string }> }) {
  const { loadId } = await params;
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  await syncClerkUserToDatabase();
  const actor = await getActorContext();

  const load = await prisma.load.findUnique({
    where: { id: loadId },
    include: {
      booking: {
        include: {
          carrierCompany: {
            select: {
              legalName: true,
              dotNumber: true,
              mcNumber: true,
              carrierType: true,
              isOwnerOperator: true,
            },
          },
        },
      },
      shipperCompany: { select: { legalName: true } },
      dispatchLink: true,
    },
  });

  if (!load) notFound();
  if (!load.booking || !load.dispatchLink) {
    return (
      <main className="min-h-screen bg-white p-6 text-sm">
        <p className="mb-4">Completion invoice needs a booking and dispatch with mutual delivery confirmation.</p>
        <Link href={`/loads/${load.id}`} className="text-emerald-700 underline">
          Back to load
        </Link>
      </main>
    );
  }

  const isRealAdmin = actor.realRole === "ADMIN" && !actor.simulated;
  const effectiveCompanyId = actor.companyId;
  const isShipperOwner =
    actor.role === "SHIPPER" && effectiveCompanyId === load.shipperCompanyId;
  const isBookedCarrier =
    (actor.role === "DISPATCHER" || actor.role === "ADMIN") &&
    Boolean(effectiveCompanyId) &&
    effectiveCompanyId === load.booking.carrierCompanyId;

  if (!isRealAdmin && !isShipperOwner && !isBookedCarrier) {
    return (
      <main className="min-h-screen bg-white p-6 text-sm">
        <p>You don&apos;t have access to this invoice.</p>
      </main>
    );
  }

  if (
    !isShipmentMutuallyComplete({
      deliveredAt: load.dispatchLink.deliveredAt,
      supplierDeliveredAt: load.dispatchLink.supplierDeliveredAt,
    })
  ) {
    return (
      <main className="min-h-screen bg-white p-6 text-sm">
        <h1 className="text-lg font-semibold">Invoice not ready</h1>
        <p className="mt-2 max-w-lg text-zinc-600">
          Both the carrier and the supplier must confirm delivery before the completion invoice unlocks.
          {!load.dispatchLink.deliveredAt ? " Carrier delivery check-in is still open." : null}
          {!load.dispatchLink.supplierDeliveredAt ? " Supplier delivery confirmation is still open." : null}
        </p>
        <Link href={`/loads/${load.id}`} className="mt-4 inline-block text-emerald-700 underline">
          Back to load
        </Link>
      </main>
    );
  }

  const agreedRate = Number(load.booking.agreedRateUsd);
  const lumber = extractLumberSpec(load.extendedPosting);

  return (
    <CompletionInvoicePrint
      loadId={load.id}
      load={{
        referenceNumber: load.referenceNumber,
        equipmentType: load.equipmentType,
        weightLbs: load.weightLbs,
        isRush: load.isRush,
        pickupCity: load.originCity,
        pickupState: load.originState,
        pickupZip: load.originZip,
        deliveryCity: load.destinationCity,
        deliveryState: load.destinationState,
        deliveryZip: load.destinationZip,
        requestedPickupAt: load.requestedPickupAt.toISOString(),
        requestedDeliveryAt: load.requestedDeliveryAt?.toISOString() ?? null,
        bookedAt: load.booking.bookedAt.toISOString(),
        formattedRate: formatMoney(agreedRate, load.booking.agreedCurrency),
      }}
      shipper={{ legalName: load.shipperCompany.legalName }}
      carrier={{
        legalName: load.booking.carrierCompany.legalName,
        dotNumber: load.booking.carrierCompany.dotNumber,
        mcNumber: load.booking.carrierCompany.mcNumber,
        carrierType: load.booking.carrierCompany.carrierType,
        isOwnerOperator: load.booking.carrierCompany.isOwnerOperator,
      }}
      completion={{
        pickupConfirmedAt: load.dispatchLink.pickupConfirmedAt!.toISOString(),
        carrierDeliveredAt: load.dispatchLink.deliveredAt!.toISOString(),
        supplierDeliveredAt: load.dispatchLink.supplierDeliveredAt!.toISOString(),
        signedBolFileUrl: load.dispatchLink.signedBolFileUrl,
        driverName: load.dispatchLink.driverName,
      }}
      lumber={lumber}
      extendedPosting={load.extendedPosting}
    />
  );
}
