import { auth } from "@clerk/nextjs/server";
import { LoadStatus, VerificationStatus } from "@prisma/client";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { LobSidebar } from "@/components/lob-sidebar";
import { LoadTimeline } from "@/components/load-timeline";
import { prisma } from "@/lib/prisma";
import { shipperCompanyNameForViewer } from "@/lib/shipper-visibility";
import { syncClerkUserToDatabase } from "@/lib/sync-clerk-user";

export const dynamic = "force-dynamic";

function fmtUsd(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

export default async function LoadDetailPage({ params }: { params: Promise<{ loadId: string }> }) {
  const { loadId } = await params;
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  await syncClerkUserToDatabase();

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
      booking: { include: { carrierCompany: { select: { id: true, legalName: true } } } },
      dispatchLink: true,
      shipperCompany: { select: { legalName: true } },
    },
  });

  if (!load) {
    notFound();
  }

  let carrierApproved = false;
  if (appUser.role === "DISPATCHER" && appUser.companyId) {
    const co = await prisma.company.findUnique({
      where: { id: appUser.companyId },
      select: { verificationStatus: true },
    });
    carrierApproved = co?.verificationStatus === VerificationStatus.APPROVED;
  }

  const isAdmin = appUser.role === "ADMIN";
  const isShipperOwner =
    appUser.role === "SHIPPER" && appUser.companyId && load.shipperCompanyId === appUser.companyId;
  const isBookedCarrier =
    load.booking &&
    appUser.companyId &&
    load.booking.carrierCompanyId === appUser.companyId &&
    (appUser.role === "DISPATCHER" || appUser.role === "ADMIN");

  const canBrowsePosted =
    appUser.role === "DISPATCHER" &&
    appUser.companyId &&
    carrierApproved &&
    load.status === LoadStatus.POSTED;

  const canView = isAdmin || isShipperOwner || isBookedCarrier || canBrowsePosted;

  if (!canView) {
    return (
      <main className="min-h-[calc(100vh-3.5rem)] bg-zinc-100 p-6">
        <div className="mx-auto max-w-lg rounded-lg border border-zinc-200 bg-white p-6 text-center">
          <h1 className="text-lg font-semibold text-zinc-900">You can&apos;t open this load</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Only the posting mill, the booked carrier, or approved carriers browsing open loads can view this page.
          </p>
          <Link href="/" className="mt-4 inline-block text-sm font-medium text-lob-navy underline">
            Back to load board
          </Link>
        </div>
      </main>
    );
  }

  const visibilityActor = { companyId: appUser.companyId, role: appUser.role };
  const millName = shipperCompanyNameForViewer(load.shipperCompany.legalName, load, visibilityActor);

  const [active, rush, delivered] = await Promise.all([
    prisma.load.count({ where: { status: { not: LoadStatus.DELIVERED } } }),
    prisma.load.count({ where: { isRush: true } }),
    prisma.load.count({ where: { status: LoadStatus.DELIVERED } }),
  ]);

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-zinc-100 p-3 text-zinc-900 sm:p-4">
      <div className="mx-auto flex max-w-[1600px] gap-0 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
        <LobSidebar active="loads" stats={{ active, rush, delivered }} />
        <div className="min-w-0 flex-1 bg-zinc-50 p-4 sm:p-6">
          <div className="mx-auto max-w-3xl">
            <Link href="/" className="text-sm font-medium text-lob-navy hover:underline">
              ← Load board
            </Link>
            <h1 className="mt-3 text-2xl font-bold text-zinc-900">{load.referenceNumber}</h1>
            <p className="mt-1 text-sm text-zinc-600">
              {load.originCity}, {load.originState} {load.originZip} → {load.destinationCity}, {load.destinationState}{" "}
              {load.destinationZip}
            </p>
            <p className="mt-2 text-sm text-zinc-700">
              <span className="font-medium">{load.weightLbs.toLocaleString()} lbs</span>
              <span className="text-zinc-400"> · </span>
              {load.equipmentType}
              {load.isRush && <span className="ml-2 font-semibold text-amber-600">RUSH</span>}
            </p>

            <div className="mt-4 flex flex-wrap gap-4 rounded-lg border border-zinc-200 bg-white p-4 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase text-zinc-500">Status</p>
                <p className="mt-1 font-semibold text-zinc-900">{load.status}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-zinc-500">Offered / booked</p>
                <p className="mt-1 font-semibold text-zinc-900">
                  {load.booking ? fmtUsd(Number(load.booking.agreedRateUsd)) : load.offeredRateUsd != null ? fmtUsd(Number(load.offeredRateUsd)) : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-zinc-500">Mill / customer</p>
                <p className="mt-1 text-zinc-900">
                  {millName ? millName : <span className="italic text-zinc-400">Private until booked</span>}
                </p>
              </div>
              {load.booking && (
                <div>
                  <p className="text-xs font-semibold uppercase text-zinc-500">Carrier</p>
                  <p className="mt-1 text-zinc-900">{load.booking.carrierCompany.legalName}</p>
                </div>
              )}
            </div>

            <div className="mt-6">
              <h2 className="text-sm font-semibold text-zinc-900">Shipment progress</h2>
              <p className="mt-1 text-xs text-zinc-500">
                Same steps your team sees in tools like Samsara or a TMS: post → book → driver → pickup → delivery.
              </p>
              <LoadTimeline
                load={{
                  status: load.status,
                  createdAt: load.createdAt.toISOString(),
                  uniquePickupCode: load.uniquePickupCode,
                }}
                booking={
                  load.booking
                    ? { bookedAt: load.booking.bookedAt.toISOString() }
                    : null
                }
                dispatch={
                  load.dispatchLink
                    ? {
                        createdAt: load.dispatchLink.createdAt.toISOString(),
                        pickupConfirmedAt: load.dispatchLink.pickupConfirmedAt?.toISOString() ?? null,
                        deliveredAt: load.dispatchLink.deliveredAt?.toISOString() ?? null,
                        status: load.dispatchLink.status,
                        token: load.dispatchLink.token,
                      }
                    : null
                }
              />
            </div>

            {load.dispatchLink && (isShipperOwner || isBookedCarrier || isAdmin) && (
              <p className="mt-4 text-sm text-zinc-600">
                Driver page:{" "}
                <Link className="font-medium text-lob-navy underline" href={`/driver/${load.dispatchLink.token}`}>
                  Open driver link
                </Link>
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
