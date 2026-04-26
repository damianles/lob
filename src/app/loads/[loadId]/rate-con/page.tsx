import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { RateConPrint } from "@/components/rate-con-print";
import { extractLumberSpec } from "@/lib/lumber-spec";
import { formatMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { syncClerkUserToDatabase } from "@/lib/sync-clerk-user";

export const dynamic = "force-dynamic";

export default async function RateConPage({ params }: { params: Promise<{ loadId: string }> }) {
  const { loadId } = await params;
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  await syncClerkUserToDatabase();
  const appUser = await prisma.user.findUnique({
    where: { authProviderId: userId },
    select: { id: true, role: true, companyId: true },
  });
  if (!appUser) redirect("/sign-in");

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
              fleetTruckCount: true,
              fleetTrailerCount: true,
            },
          },
        },
      },
      shipperCompany: {
        select: { legalName: true, supplierKind: true },
      },
    },
  });

  if (!load) notFound();
  if (!load.booking) {
    return (
      <main className="min-h-screen bg-white p-6 text-sm">
        <p className="mb-4">No booking on this load yet — rate confirmation is only available after booking.</p>
        <Link href={`/loads/${load.id}`} className="text-emerald-700 underline">
          Back to load
        </Link>
      </main>
    );
  }

  const isAdmin = appUser.role === "ADMIN";
  const isShipperOwner =
    appUser.role === "SHIPPER" && appUser.companyId === load.shipperCompanyId;
  const isBookedCarrier =
    (appUser.role === "DISPATCHER" || appUser.role === "ADMIN") &&
    appUser.companyId === load.booking.carrierCompanyId;

  if (!isAdmin && !isShipperOwner && !isBookedCarrier) {
    return (
      <main className="min-h-screen bg-white p-6 text-sm">
        <p>You don&apos;t have access to this rate confirmation.</p>
      </main>
    );
  }

  const lumber = extractLumberSpec(load.extendedPosting);
  const agreedRate = Number(load.booking.agreedRateUsd);
  const agreedCurrency = load.booking.agreedCurrency;

  return (
    <RateConPrint
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
        bookedAt: load.booking.bookedAt.toISOString(),
        formattedRate: formatMoney(agreedRate, agreedCurrency),
        agreedRate,
        agreedCurrency,
      }}
      shipper={{ legalName: load.shipperCompany.legalName }}
      carrier={{
        legalName: load.booking.carrierCompany.legalName,
        dotNumber: load.booking.carrierCompany.dotNumber,
        mcNumber: load.booking.carrierCompany.mcNumber,
        carrierType: load.booking.carrierCompany.carrierType,
        isOwnerOperator: load.booking.carrierCompany.isOwnerOperator,
        fleetTruckCount: load.booking.carrierCompany.fleetTruckCount,
        fleetTrailerCount: load.booking.carrierCompany.fleetTrailerCount,
      }}
      lumber={lumber}
    />
  );
}
