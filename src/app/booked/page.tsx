import Link from "next/link";
import { LoadStatus } from "@prisma/client";

import { LobBrandStrip } from "@/components/lob-brand-strip";
import { LobSidebar } from "@/components/lob-sidebar";
import { ShipmentsWorkspace, type ShipmentRow, type ShipmentsActor } from "@/components/shipments-workspace";
import { extractLumberSpec } from "@/lib/lumber-spec";
import { prisma } from "@/lib/prisma";
import { getActorContext } from "@/lib/request-context";

export const dynamic = "force-dynamic";

export default async function ShipmentsPage() {
  const actor = await getActorContext();
  if (!actor.userId) {
    return (
      <main className="mx-auto max-w-lg p-8">
        <h1 className="text-xl font-bold">Shipments</h1>
        <p className="mt-2 text-sm text-zinc-600">Sign in to track your loads.</p>
        <Link href="/sign-in" className="mt-4 inline-block text-lob-navy underline">
          Sign in
        </Link>
      </main>
    );
  }

  let where:
    | { OR?: Array<Record<string, unknown>> }
    | { shipperCompanyId: string }
    | { booking: { is: { carrierCompanyId: string } } }
    | null = null;
  let perspective: ShipmentsActor["perspective"] = "admin";

  if (actor.role === "ADMIN") {
    where = {};
    perspective = "admin";
  } else if (actor.role === "SHIPPER" && actor.companyId) {
    where = { shipperCompanyId: actor.companyId };
    perspective = "shipper";
  } else if (actor.role === "DISPATCHER" && actor.companyId) {
    where = { booking: { is: { carrierCompanyId: actor.companyId } } };
    perspective = "carrier";
  }

  if (!where) {
    return (
      <main className="min-h-[calc(100vh-3.5rem)] bg-lob-paper text-stone-900">
        <div className="mx-auto flex max-w-[1600px] gap-0 rounded-lg border border-zinc-200 bg-white shadow-sm">
          <LobSidebar active="booked" />
          <div className="min-w-0 flex-1 p-8">
            <LobBrandStrip />
            <h1 className="mt-4 text-2xl font-bold">Shipments</h1>
            <p className="mt-2 text-sm text-zinc-600">
              Complete onboarding as a mill/wholesaler or carrier to see shipments tied to your company.
            </p>
            <Link href="/onboarding" className="mt-4 inline-block font-medium text-lob-navy underline">
              Account setup
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const loads = await prisma.load.findMany({
    where,
    orderBy: [{ requestedPickupAt: "desc" }],
    take: 500,
    include: {
      booking: {
        include: {
          carrierCompany: {
            select: { legalName: true, carrierType: true, isOwnerOperator: true },
          },
        },
      },
      dispatchLink: true,
      shipperCompany: { select: { legalName: true } },
    },
  });

  // Same scope as the list: admins see platform-wide counts; shippers and carriers
  // only see counts for their company's loads.
  const [active, rush, delivered] = await Promise.all([
    prisma.load.count({ where: { ...where, status: { not: LoadStatus.DELIVERED } } }),
    prisma.load.count({ where: { ...where, isRush: true } }),
    prisma.load.count({ where: { ...where, status: LoadStatus.DELIVERED } }),
  ]);

  const shipments: ShipmentRow[] = loads.map((l) => ({
    id: l.id,
    referenceNumber: l.referenceNumber,
    status: l.status,
    isRush: l.isRush,
    equipmentType: l.equipmentType,
    weightLbs: l.weightLbs,
    originCity: l.originCity,
    originState: l.originState,
    originZip: l.originZip,
    destinationCity: l.destinationCity,
    destinationState: l.destinationState,
    destinationZip: l.destinationZip,
    requestedPickupAt: l.requestedPickupAt.toISOString(),
    bookedAt: l.booking?.bookedAt.toISOString() ?? null,
    pickupConfirmedAt: l.dispatchLink?.pickupConfirmedAt?.toISOString() ?? null,
    deliveredAt: l.dispatchLink?.deliveredAt?.toISOString() ?? null,
    rateUsd: l.booking
      ? Number(l.booking.agreedRateUsd)
      : l.offeredRateUsd != null
        ? Number(l.offeredRateUsd)
        : null,
    rateCurrency: l.booking ? l.booking.agreedCurrency : l.offerCurrency,
    shipperName: l.shipperCompany.legalName,
    carrierName: l.booking?.carrierCompany.legalName ?? null,
    carrierType: l.booking?.carrierCompany.carrierType ?? null,
    isOwnerOperator: l.booking?.carrierCompany.isOwnerOperator ?? false,
    hasDispatchLink: l.dispatchLink != null,
    lumberSpec: extractLumberSpec(l.extendedPosting),
  }));

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-lob-paper text-stone-900">
      <div className="mx-auto flex max-w-[1600px] gap-0 rounded-lg border border-zinc-200 bg-white shadow-sm">
        <LobSidebar active="booked" stats={{ active, rush, delivered }} />
        <div className="min-w-0 flex-1">
          <LobBrandStrip />
          <div className="p-6 lg:p-8">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold text-zinc-900">Shipments</h1>
                <p className="mt-1 max-w-2xl text-sm text-zinc-600">
                  {perspective === "shipper"
                    ? "Every load you've posted — open, in-transit, and historical. Filter, sort, export to CSV."
                    : perspective === "carrier"
                      ? "Every load you've booked — current freight and a full delivery history. Sortable & exportable."
                      : "Platform-wide shipment ledger. All shippers and carriers."}
                </p>
              </div>
              {perspective === "shipper" && (
                <div className="flex flex-wrap gap-2">
                  <Link
                    href="/?post=open"
                    className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
                  >
                    Post a load
                  </Link>
                  <Link
                    href="/post/bulk"
                    className="rounded-lg border border-emerald-700 bg-white px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50"
                  >
                    Bulk upload (CSV)
                  </Link>
                </div>
              )}
            </div>

            <ShipmentsWorkspace
              shipments={shipments}
              actor={{
                role:
                  actor.role === "ADMIN" || actor.role === "SHIPPER" || actor.role === "DISPATCHER"
                    ? actor.role
                    : "GUEST",
                perspective,
              }}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
