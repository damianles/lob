import { auth } from "@clerk/nextjs/server";
import { LoadStatus } from "@prisma/client";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { EditLoadForm } from "@/components/edit-load-form";
import { LobBrandStrip } from "@/components/lob-brand-strip";
import { LobSidebar } from "@/components/lob-sidebar";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { prisma } from "@/lib/prisma";
import { getActorContext } from "@/lib/request-context";
import { syncClerkUserToDatabase } from "@/lib/sync-clerk-user";

export const dynamic = "force-dynamic";

export default async function EditLoadPage({ params }: { params: Promise<{ loadId: string }> }) {
  const { loadId } = await params;
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  await syncClerkUserToDatabase();
  const actor = await getActorContext();

  const load = await prisma.load.findUnique({
    where: { id: loadId },
    include: {
      booking: { select: { id: true } },
      shipperCompany: { select: { legalName: true } },
    },
  });
  if (!load) notFound();

  const isRealAdmin = actor.realRole === "ADMIN" && !actor.simulated;
  const isOwner =
    actor.role === "SHIPPER" &&
    Boolean(actor.companyId) &&
    load.shipperCompanyId === actor.companyId;

  if (!isOwner && !isRealAdmin) {
    redirect(`/loads/${loadId}`);
  }

  if (
    load.status === LoadStatus.CANCELLED ||
    load.status === LoadStatus.DELIVERED ||
    load.status === LoadStatus.IN_TRANSIT
  ) {
    redirect(`/loads/${loadId}`);
  }

  const notes =
    load.extendedPosting &&
    typeof load.extendedPosting === "object" &&
    !Array.isArray(load.extendedPosting) &&
    typeof (load.extendedPosting as { notes?: unknown }).notes === "string"
      ? ((load.extendedPosting as { notes: string }).notes ?? "")
      : "";

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-zinc-100 p-3 text-zinc-900 sm:p-4">
      <div className="mx-auto flex max-w-[1600px] gap-0 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
        <LobSidebar active="loads" />
        <div className="min-w-0 flex-1 bg-zinc-50">
          <LobBrandStrip />
          <div className="p-4 sm:p-6">
            <div className="mx-auto max-w-2xl">
              <Breadcrumb
                items={[
                  { label: `${load.shipperCompany.legalName} Loads`, href: "/" },
                  { label: load.referenceNumber, href: `/loads/${load.id}` },
                  { label: "Edit" },
                ]}
                className="mb-4"
              />
              <h1 className="text-2xl font-bold text-zinc-900">Edit load</h1>
              <p className="mt-1 text-sm text-zinc-600">
                Update route, dates, rate, or notes.{" "}
                <Link href={`/loads/${load.id}`} className="font-medium text-lob-navy underline">
                  Back to detail
                </Link>
              </p>
              <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-4 sm:p-5">
                <EditLoadForm
                  load={{
                    id: load.id,
                    referenceNumber: load.referenceNumber,
                    status: load.status,
                    originCity: load.originCity,
                    originState: load.originState,
                    originZip: load.originZip,
                    destinationCity: load.destinationCity,
                    destinationState: load.destinationState,
                    destinationZip: load.destinationZip,
                    weightLbs: load.weightLbs,
                    equipmentType: load.equipmentType,
                    isRush: load.isRush,
                    offerCurrency: load.offerCurrency,
                    offeredRateUsd: load.offeredRateUsd != null ? Number(load.offeredRateUsd) : null,
                    requestedPickupAt: load.requestedPickupAt.toISOString(),
                    requestedDeliveryAt: load.requestedDeliveryAt?.toISOString() ?? null,
                    notes,
                    booked: Boolean(load.booking),
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
