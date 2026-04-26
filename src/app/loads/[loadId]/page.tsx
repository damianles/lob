import { auth } from "@clerk/nextjs/server";
import { LoadStatus, VerificationStatus } from "@prisma/client";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { CarrierTypeTag } from "@/components/carrier-type-tag";
import { DispatchQrPanel } from "@/components/dispatch-qr-panel";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { LobBrandStrip } from "@/components/lob-brand-strip";
import { LobSidebar } from "@/components/lob-sidebar";
import { LoadTimeline } from "@/components/load-timeline";
import { LumberSpecPanel } from "@/components/lumber-spec-panel";
import { prisma } from "@/lib/prisma";
import { carrierCompanyNameForViewer } from "@/lib/carrier-visibility";
import { equipmentLabel } from "@/lib/lumber-equipment";
import { extractLumberSpec } from "@/lib/lumber-spec";
import { formatMoney } from "@/lib/money";
import {
  shipperCompanyNameForViewer,
  supplierKindForViewer,
  supplierKindLabel,
} from "@/lib/shipper-visibility";
import { carrierMayViewPostedLoad } from "@/lib/carrier-load-access";
import { syncClerkUserToDatabase } from "@/lib/sync-clerk-user";

export const dynamic = "force-dynamic";

function parseTrailerJson(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
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
      booking: {
        include: {
          carrierCompany: {
            select: {
              id: true,
              legalName: true,
              dotNumber: true,
              mcNumber: true,
              carrierType: true,
              fleetTruckCount: true,
              fleetTrailerCount: true,
              trailerEquipmentTypes: true,
              carrierProfileBlurb: true,
              factoringEligible: true,
              isOwnerOperator: true,
              verificationStatus: true,
            },
          },
        },
      },
      dispatchLink: true,
      shipperCompany: { select: { legalName: true, supplierKind: true } },
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

  let canBrowsePosted = false;
  if (
    appUser.role === "DISPATCHER" &&
    appUser.companyId &&
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
      appUser.companyId,
    );
  }

  const canView = isAdmin || isShipperOwner || isBookedCarrier || canBrowsePosted;

  const carrierDocs =
    load.booking && (isShipperOwner || isAdmin)
      ? await prisma.document.findMany({
          where: { companyId: load.booking.carrierCompanyId, dispatchLinkId: null },
          orderBy: { createdAt: "desc" },
          take: 20,
          select: { kind: true, expiresAt: true },
        })
      : [];

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
  const supplierKindVisible = supplierKindForViewer(load.shipperCompany.supplierKind, load, visibilityActor);
  const carrierNameVisible = load.booking
    ? carrierCompanyNameForViewer(load.booking.carrierCompany.legalName, load, visibilityActor)
    : null;

  const [active, rush, delivered] = await Promise.all([
    prisma.load.count({ where: { status: { not: LoadStatus.DELIVERED } } }),
    prisma.load.count({ where: { isRush: true } }),
    prisma.load.count({ where: { status: LoadStatus.DELIVERED } }),
  ]);

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const baseUrl = `${proto}://${host}`;

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-zinc-100 p-3 text-zinc-900 sm:p-4">
      <div className="mx-auto flex max-w-[1600px] gap-0 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
        <LobSidebar active="loads" stats={{ active, rush, delivered }} />
        <div className="min-w-0 flex-1 bg-zinc-50">
          <LobBrandStrip />
          <div className="p-4 sm:p-6">
          <div className="mx-auto max-w-3xl">
            <Breadcrumb
              items={[
                { label: "Loads", href: "/" },
                { label: load.referenceNumber },
              ]}
              className="mb-4"
            />
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
            <p className="mt-1 text-sm text-zinc-600">
              Requested pickup:{" "}
              <span className="font-medium text-zinc-900">
                {load.requestedPickupAt.toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </p>

            <div className="mt-4 flex flex-wrap gap-4 rounded-lg border border-zinc-200 bg-white p-4 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase text-zinc-500">Status</p>
                <p className="mt-1 font-semibold text-zinc-900">{load.status}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-zinc-500">Offered / booked</p>
                <p className="mt-1 font-semibold text-zinc-900">
                  {load.booking
                    ? formatMoney(Number(load.booking.agreedRateUsd), load.booking.agreedCurrency)
                    : load.offeredRateUsd != null
                      ? formatMoney(Number(load.offeredRateUsd), load.offerCurrency)
                      : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-zinc-500">Supplier / customer</p>
                <p className="mt-1 text-zinc-900">
                  {millName ? millName : <span className="italic text-zinc-400">Private until booked</span>}
                </p>
                {supplierKindVisible && (
                  <p className="mt-1 text-xs text-zinc-600">
                    Supplier type: <span className="font-medium">{supplierKindLabel(supplierKindVisible)}</span>
                  </p>
                )}
              </div>
              {load.booking && (
                <div>
                  <p className="text-xs font-semibold uppercase text-zinc-500">Carrier</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <p className="text-zinc-900">
                      {carrierNameVisible ? (
                        carrierNameVisible
                      ) : (
                        <span className="italic text-zinc-500">Booked</span>
                      )}
                    </p>
                    <CarrierTypeTag
                      carrierType={load.booking.carrierCompany.carrierType}
                      isOwnerOperator={load.booking.carrierCompany.isOwnerOperator}
                    />
                  </div>
                </div>
              )}
            </div>

            {(() => {
              const lumber = extractLumberSpec(load.extendedPosting);
              return lumber ? <LumberSpecPanel spec={lumber} className="mt-4" /> : null;
            })()}

            {load.booking && (isShipperOwner || isAdmin) && (
              <section className="mt-6 rounded-lg border border-zinc-200 bg-white p-4 text-sm">
                <h2 className="text-base font-semibold text-zinc-900">Carrier profile (post-booking)</h2>
                <p className="mt-1 text-xs text-zinc-500">
                  Review the transport company before the truck arrives. Data comes from their LOB carrier profile.
                </p>
                <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-semibold uppercase text-zinc-500">Legal name</dt>
                    <dd className="font-medium text-zinc-900">{load.booking.carrierCompany.legalName}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase text-zinc-500">Verification</dt>
                    <dd className="text-zinc-800">{load.booking.carrierCompany.verificationStatus}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase text-zinc-500">Carrier type</dt>
                    <dd>
                      <CarrierTypeTag
                        carrierType={load.booking.carrierCompany.carrierType}
                        isOwnerOperator={load.booking.carrierCompany.isOwnerOperator}
                      />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase text-zinc-500">DOT</dt>
                    <dd>{load.booking.carrierCompany.dotNumber ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase text-zinc-500">MC</dt>
                    <dd>{load.booking.carrierCompany.mcNumber ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase text-zinc-500">Fleet</dt>
                    <dd>
                      {load.booking.carrierCompany.fleetTruckCount ?? "—"} trucks ·{" "}
                      {load.booking.carrierCompany.fleetTrailerCount ?? "—"} trailers
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase text-zinc-500">Equipment</dt>
                    <dd>
                      {parseTrailerJson(load.booking.carrierCompany.trailerEquipmentTypes)
                        .map((c) => equipmentLabel(c))
                        .join(", ") || "—"}
                    </dd>
                  </div>
                </dl>
                {load.booking.carrierCompany.carrierProfileBlurb && (
                  <p className="mt-4 whitespace-pre-wrap text-zinc-700">{load.booking.carrierCompany.carrierProfileBlurb}</p>
                )}
                {load.booking.carrierCompany.isOwnerOperator && (
                  <p className="mt-3 text-xs font-medium text-amber-800">Owner-operator / small fleet</p>
                )}
                {load.booking.carrierCompany.factoringEligible && (
                  <p className="mt-2 text-xs text-emerald-800">
                    Factoring-eligible carrier — may use quick-pay programs.
                  </p>
                )}
                {carrierDocs.length > 0 && (
                  <div className="mt-4 border-t border-zinc-100 pt-3">
                    <p className="text-xs font-semibold uppercase text-zinc-500">Documents on file</p>
                    <ul className="mt-2 space-y-1 text-xs text-zinc-700">
                      {carrierDocs.map((d, i) => (
                        <li key={`${d.kind}-${i}-${d.expiresAt?.toISOString() ?? ""}`}>
                          {d.kind}
                          {d.expiresAt
                            ? ` · expires ${d.expiresAt.toLocaleDateString()}`
                            : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            )}

            {load.extendedPosting != null && (
              <details className="mt-4 rounded-lg border border-zinc-200 bg-white p-4 text-sm">
                <summary className="cursor-pointer font-medium text-zinc-900">Full post details (supplier)</summary>
                <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap break-words text-xs text-zinc-700">
                  {JSON.stringify(load.extendedPosting, null, 2)}
                </pre>
              </details>
            )}

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
              <div className="mt-6 space-y-3">
                <p className="text-sm text-zinc-600">
                  Driver page:{" "}
                  <Link className="font-medium text-lob-navy underline" href={`/driver/${load.dispatchLink.token}`}>
                    Open driver link
                  </Link>
                </p>
                <DispatchQrPanel
                  pickupUrl={`${baseUrl}/facility/pickup/${load.dispatchLink.token}`}
                  deliveryUrl={`${baseUrl}/facility/delivery/${load.dispatchLink.token}`}
                  driverUrl={`${baseUrl}/driver/${load.dispatchLink.token}`}
                />
              </div>
            )}
          </div>
          </div>
        </div>
      </div>
    </main>
  );
}
