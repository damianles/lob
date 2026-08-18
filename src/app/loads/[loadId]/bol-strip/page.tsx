import { auth } from "@clerk/nextjs/server";
import { LoadStatus, VerificationStatus } from "@prisma/client";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { BolPickupStrip } from "@/components/bol-pickup-strip";
import { extractLumberSpec } from "@/lib/lumber-spec";
import { prisma } from "@/lib/prisma";
import { carrierMayViewPostedLoad } from "@/lib/carrier-load-access";
import { shipperCompanyNameForViewer } from "@/lib/shipper-visibility";
import { syncClerkUserToDatabase } from "@/lib/sync-clerk-user";
import { getActorContext } from "@/lib/request-context";

export const dynamic = "force-dynamic";

export default async function BolStripPage({ params }: { params: Promise<{ loadId: string }> }) {
  const { loadId } = await params;
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  await syncClerkUserToDatabase();
  const actor = await getActorContext();

  const appUser = await prisma.user.findUnique({
    where: { authProviderId: userId },
    select: { id: true, companyId: true, role: true },
  });
  if (!appUser) {
    redirect("/sign-in");
  }

  const load = await prisma.load.findUnique({
    where: { id: loadId },
    include: {
      booking: true,
      dispatchLink: true,
      shipperCompany: { select: { legalName: true } },
    },
  });
  if (!load) {
    notFound();
  }

  let carrierApproved = false;
  if (actor.role === "DISPATCHER" && actor.companyId) {
    const co = await prisma.company.findUnique({
      where: { id: actor.companyId },
      select: { verificationStatus: true },
    });
    carrierApproved = co?.verificationStatus === VerificationStatus.APPROVED;
  }

  const effectiveCompanyId = actor.companyId;
  const isRealAdmin = actor.realRole === "ADMIN" && !actor.simulated;
  const isShipperOwner =
    actor.role === "SHIPPER" &&
    Boolean(effectiveCompanyId) &&
    load.shipperCompanyId === effectiveCompanyId;
  const isBookedCarrier =
    Boolean(load.booking) &&
    Boolean(effectiveCompanyId) &&
    load.booking!.carrierCompanyId === effectiveCompanyId &&
    (actor.role === "DISPATCHER" || actor.role === "ADMIN");

  let canBrowsePosted = false;
  if (
    actor.role === "DISPATCHER" &&
    effectiveCompanyId &&
    carrierApproved &&
    load.status === LoadStatus.POSTED
  ) {
    canBrowsePosted = await carrierMayViewPostedLoad(
      prisma,
      {
        id: load.id,
        shipperCompanyId: load.shipperCompanyId,
        carrierVisibilityMode: load.carrierVisibilityMode,
      },
      effectiveCompanyId,
    );
  }

  const canView = isRealAdmin || isShipperOwner || isBookedCarrier || canBrowsePosted;
  if (!canView) {
    notFound();
  }

  if (!load.dispatchLink) {
    return (
      <main className="min-h-screen bg-stone-50 px-4 py-10 text-zinc-900">
        <div className="mx-auto max-w-md rounded-2xl border border-stone-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-lg font-semibold">Driver haul sheet not available yet</h1>
          <p className="mt-2 text-sm text-stone-600">
            Create a driver dispatch link from the load first. Yard pickup links and office QRs are on the load for the
            posting mill.
          </p>
          <Link href={`/loads/${loadId}`} className="mt-4 inline-block text-sm font-medium text-lob-navy underline">
            Back to load
          </Link>
        </div>
      </main>
    );
  }

  const visibilityActor = { companyId: effectiveCompanyId, role: actor.role };
  const millName = shipperCompanyNameForViewer(load.shipperCompany.legalName, load, visibilityActor);
  const lumberSpec = extractLumberSpec(load.extendedPosting);

  return (
    <main className="min-h-screen bg-stone-100 print:bg-white print:p-0">
      <div className="print:hidden border-b border-stone-200 bg-white px-4 py-3">
        <Link href={`/loads/${loadId}`} className="text-sm font-medium text-lob-navy underline">
          ← Back to {load.referenceNumber}
        </Link>
      </div>
      <BolPickupStrip
        inApp
        referenceNumber={load.referenceNumber}
        originLine={`${load.originCity}, ${load.originState} ${load.originZip}`}
        destinationLine={`${load.destinationCity}, ${load.destinationState} ${load.destinationZip}`}
        weightLbs={load.weightLbs}
        equipmentType={load.equipmentType}
        millLabel={millName}
        driverName={load.dispatchLink.driverName}
        lumberSpec={lumberSpec}
      />
    </main>
  );
}
