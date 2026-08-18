import { auth } from "@clerk/nextjs/server";
import { LoadBidStatus, LoadStatus, VerificationStatus } from "@prisma/client";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { CarrierRateActions } from "@/components/carrier-rate-actions";
import { CancelLoadButton } from "@/components/cancel-load-button";
import { ConvertToFirmRate } from "@/components/convert-to-firm-rate";
import { LaneDecisionStats } from "@/components/lane-decision-stats";
import { RateModeBadge } from "@/components/rate-mode-badge";
import { ShipperBidReviewList } from "@/components/shipper-bid-review-list";
import { CarrierScorecard } from "@/components/carrier-scorecard";
import { CarrierTypeTag } from "@/components/carrier-type-tag";
import { CreateDispatchForm } from "@/components/create-dispatch-form";
import { DriverLinkPanel } from "@/components/driver-link-panel";
import { FacilitySiteLinksPanel } from "@/components/facility-site-links-panel";
import { ShipperConfirmPickup } from "@/components/shipper-confirm-pickup";
import { ExtendedPostingPanel } from "@/components/extended-posting-panel";
import { LoadDateChangePanel } from "@/components/load-date-change-panel";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { LobBrandStrip } from "@/components/lob-brand-strip";
import { LobSidebar } from "@/components/lob-sidebar";
import { LoadTimeline } from "@/components/load-timeline";
import { LumberSpecPanel } from "@/components/lumber-spec-panel";
import { prisma } from "@/lib/prisma";
import { carrierCompanyNameForViewer } from "@/lib/carrier-visibility";
import { getLaneDecisionContext, getRepeatCarrierCounts } from "@/lib/lane-decision-context";
import { formatPostedDateWithOptionalTime } from "@/lib/format-posted-datetime";
import { extractLoadExecution, firstStopTime } from "@/lib/load-execution";
import { extractLumberSpec } from "@/lib/lumber-spec";
import { formatMoney } from "@/lib/money";
import { formatTimeRemaining } from "@/lib/rate-mode";
import {
  shipperCompanyNameForViewer,
  supplierKindForViewer,
  supplierKindLabel,
} from "@/lib/shipper-visibility";
import { carrierMayViewPostedLoad } from "@/lib/carrier-load-access";
import { syncClerkUserToDatabase } from "@/lib/sync-clerk-user";
import { getActorContext } from "@/lib/request-context";

export const dynamic = "force-dynamic";

export default async function LoadDetailPage({ params }: { params: Promise<{ loadId: string }> }) {
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
      bids: {
        where: { status: LoadBidStatus.PENDING },
        orderBy: { createdAt: "desc" },
        include: { carrierCompany: { select: { id: true, legalName: true } } },
      },
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

  // Use effective actor company/role (respects admin view-as). Never gate on
  // appUser.companyId alone — admins simulating a supplier have companyId null
  // on the User row but a seed company on actor.companyId.
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
    return (
      <main className="min-h-[calc(100vh-3.5rem)] bg-zinc-100 p-6">
        <div className="mx-auto max-w-lg rounded-lg border border-zinc-200 bg-white p-6 text-center">
          <h1 className="text-lg font-semibold text-zinc-900">You can&apos;t open this load</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Only the posting mill, the booked carrier, or approved carriers browsing open loads can view this page.
          </p>
          <Link href={actor.role === "SHIPPER" ? "/shipments" : "/"} className="mt-4 inline-block text-sm font-medium text-lob-navy underline">
            {actor.role === "SHIPPER" ? "Back to shipments" : "Back to open loads"}
          </Link>
        </div>
      </main>
    );
  }

  const carrierDocs =
    load.booking && (isShipperOwner || isRealAdmin)
      ? await prisma.document.findMany({
          where: { companyId: load.booking.carrierCompanyId, dispatchLinkId: null },
          orderBy: { createdAt: "desc" },
          take: 20,
          select: { kind: true, expiresAt: true },
        })
      : [];

  const decisionCompanyId = isShipperOwner || isRealAdmin ? load.shipperCompanyId : effectiveCompanyId;
  const [decision, repeats] = await Promise.all([
    actor.role === "DRIVER" || !decisionCompanyId
      ? Promise.resolve(null)
      : getLaneDecisionContext({
          originState: load.originState,
          destinationState: load.destinationState,
          originZip: load.originZip,
          destinationZip: load.destinationZip,
          originCity: load.originCity,
          destinationCity: load.destinationCity,
          equipmentType: load.equipmentType,
          offerCurrency: load.offerCurrency,
          companyId: decisionCompanyId,
          asShipper: isShipperOwner || isRealAdmin,
        }),
    isShipperOwner || isRealAdmin
      ? getRepeatCarrierCounts({
          shipperCompanyId: load.shipperCompanyId,
          originCity: load.originCity,
          destinationCity: load.destinationCity,
          originState: load.originState,
          destinationState: load.destinationState,
          carrierCompanyIds: load.bids.map((b) => b.carrierCompanyId),
        })
      : Promise.resolve({} as Record<string, number>),
  ]);

  const visibilityActor = { companyId: effectiveCompanyId, role: actor.role };
  const millName = shipperCompanyNameForViewer(load.shipperCompany.legalName, load, visibilityActor);
  const supplierKindVisible = supplierKindForViewer(load.shipperCompany.supplierKind, load, visibilityActor);
  const carrierNameVisible = load.booking
    ? carrierCompanyNameForViewer(load.booking.carrierCompany.legalName, load, visibilityActor)
    : null;

  const supplierStatsScope =
    actor.role === "SHIPPER" && effectiveCompanyId
      ? { shipperCompanyId: effectiveCompanyId }
      : undefined;

  const [active, rush, delivered] = await Promise.all([
    prisma.load.count({
      where: { status: { not: LoadStatus.DELIVERED }, ...supplierStatsScope },
    }),
    prisma.load.count({ where: { isRush: true, ...supplierStatsScope } }),
    prisma.load.count({ where: { status: LoadStatus.DELIVERED, ...supplierStatsScope } }),
  ]);

  const execution = extractLoadExecution(load.extendedPosting);
  const pickupLabel = formatPostedDateWithOptionalTime(load.requestedPickupAt, firstStopTime(execution.pickups));
  const deliveryLabel = formatPostedDateWithOptionalTime(
    load.requestedDeliveryAt,
    firstStopTime(execution.deliveries),
  );

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-zinc-100 p-3 text-zinc-900 sm:p-4">
      <div className="mx-auto flex max-w-[1600px] gap-0 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
        <LobSidebar
          active={isShipperOwner || isBookedCarrier ? "shipments" : "loads"}
          stats={{ active, rush, delivered }}
        />
        <div className="min-w-0 flex-1 bg-zinc-50">
          <LobBrandStrip />
          <div className="p-4 sm:p-6">
          <div className="mx-auto max-w-3xl">
            <Breadcrumb
              items={[
                {
                  label:
                    isShipperOwner && millName
                      ? `${millName} Shipments`
                      : isBookedCarrier
                        ? "Shipments"
                        : "Open Loads",
                  href: isShipperOwner || isBookedCarrier ? "/shipments" : "/",
                },
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
            {pickupLabel ? (
              <p className="mt-1 text-sm text-zinc-600">
                Requested pickup: <span className="font-medium text-zinc-900">{pickupLabel}</span>
              </p>
            ) : null}
            {deliveryLabel ? (
              <p className="mt-1 text-sm text-zinc-600">
                Expected delivery: <span className="font-medium text-zinc-900">{deliveryLabel}</span>
              </p>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-4 rounded-lg border border-zinc-200 bg-white p-4 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase text-zinc-500">Status</p>
                <p className="mt-1 font-semibold text-zinc-900">{load.status}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-zinc-500">Rate</p>
                <p className="mt-1 font-semibold text-zinc-900">
                  {load.booking
                    ? formatMoney(Number(load.booking.agreedRateUsd), load.booking.agreedCurrency)
                    : load.rateMode === "OPEN_BID"
                      ? load.offeredRateUsd != null
                        ? `Target ${formatMoney(Number(load.offeredRateUsd), load.offerCurrency)}`
                        : "Open bid"
                      : load.offeredRateUsd != null
                        ? formatMoney(Number(load.offeredRateUsd), load.offerCurrency)
                        : "—"}
                </p>
                <div className="mt-1">
                  <RateModeBadge rateMode={load.rateMode} allowCounterOffers={load.allowCounterOffers} />
                </div>
                {load.rateMode === "OPEN_BID" && load.bidWindowExpiresAt && !load.booking && (
                  <p className="mt-1 text-xs text-zinc-500">
                    Bidding {formatTimeRemaining(load.bidWindowExpiresAt) ?? `ends ${load.bidWindowExpiresAt.toLocaleString()}`}
                  </p>
                )}
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

            {load.status === LoadStatus.POSTED &&
              !isShipperOwner &&
              (actor.role === "DISPATCHER" || actor.role === "ADMIN") && (
              <div className="mt-4 rounded-lg border border-stone-200 bg-white p-4">
                <h3 className="text-sm font-semibold text-zinc-900">Book or bid</h3>
                <div className="mt-3">
                  <CarrierRateActions
                    loadId={load.id}
                    offerCurrency={load.offerCurrency}
                    offeredRateUsd={load.offeredRateUsd != null ? Number(load.offeredRateUsd) : null}
                    rateMode={load.rateMode}
                    allowCounterOffers={load.allowCounterOffers}
                    bidWindowExpiresAt={load.bidWindowExpiresAt?.toISOString() ?? null}
                    myPendingAmount={
                      load.bids.find((b) => b.carrierCompanyId === effectiveCompanyId)
                        ? Number(load.bids.find((b) => b.carrierCompanyId === effectiveCompanyId)!.amountUsd)
                        : null
                    }
                    decision={isShipperOwner || isRealAdmin ? null : decision}
                  />
                </div>
              </div>
            )}

            {load.status === LoadStatus.POSTED && (isShipperOwner || isRealAdmin) && (
              <div className="mt-4 rounded-lg border border-stone-200 bg-white p-4">
                <h3 className="text-sm font-semibold text-zinc-900">Pending bids &amp; counters</h3>
                <p className="mt-1 text-xs text-zinc-500">
                  Accepting a bid books the load at that amount and closes the others.
                </p>
                {decision ? (
                  <div className="mt-3">
                    <LaneDecisionStats ctx={decision} />
                  </div>
                ) : null}
                <div className="mt-3">
                  <ShipperBidReviewList
                    loadId={load.id}
                    postedRate={load.offeredRateUsd != null ? Number(load.offeredRateUsd) : null}
                    marketAvg={decision?.marketAvg ?? null}
                    miles={decision?.miles ?? null}
                    bids={load.bids.map((b) => ({
                      id: b.id,
                      kind: b.kind,
                      amountUsd: Number(b.amountUsd),
                      currency: b.currency,
                      note: b.note,
                      expiresAt: b.expiresAt.toISOString(),
                      createdAt: b.createdAt.toISOString(),
                      carrierName: b.carrierCompany.legalName,
                      carrierCompanyId: b.carrierCompany.id,
                      priorMovesWithYou: repeats[b.carrierCompanyId] ?? 0,
                    }))}
                  />
                </div>
                {load.rateMode === "OPEN_BID" ? (
                  <ConvertToFirmRate
                    loadId={load.id}
                    currency={load.offerCurrency}
                    defaultRate={load.offeredRateUsd != null ? Number(load.offeredRateUsd) : decision?.marketAvg ?? null}
                  />
                ) : null}
              </div>
            )}

            {(isShipperOwner || isRealAdmin) && (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                {(load.status === LoadStatus.POSTED ||
                  load.status === LoadStatus.BOOKED ||
                  load.status === LoadStatus.ASSIGNED) && (
                  <Link
                    href={`/loads/${load.id}/edit`}
                    className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
                  >
                    Edit load
                  </Link>
                )}
                {load.status === LoadStatus.BOOKED && (
                  <Link
                    href={`/loads/${load.id}/rate-con`}
                    className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
                  >
                    Rate confirmation
                  </Link>
                )}
                {(load.status === LoadStatus.BOOKED || load.status === LoadStatus.ASSIGNED || load.status === LoadStatus.IN_TRANSIT) && (
                  <Link
                    href={`/loads/${load.id}/bol-strip`}
                    className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
                  >
                    BOL / pickup strip
                  </Link>
                )}
                <CancelLoadButton
                  loadId={load.id}
                  referenceNumber={load.referenceNumber}
                  status={load.status}
                />
              </div>
            )}

            {(() => {
              const lumber = extractLumberSpec(load.extendedPosting);
              return lumber ? <LumberSpecPanel spec={lumber} className="mt-4" /> : null;
            })()}

            {load.booking && (isShipperOwner || isRealAdmin) && (
              <div className="mt-6">
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-base font-semibold text-zinc-900">Carrier scorecard</h2>
                  <Link
                    href={`/loads/${load.id}/rate-con`}
                    className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800"
                  >
                    Rate confirmation (print / PDF)
                  </Link>
                </div>
                <CarrierScorecard
                  carrier={{
                    legalName: load.booking.carrierCompany.legalName,
                    dotNumber: load.booking.carrierCompany.dotNumber,
                    mcNumber: load.booking.carrierCompany.mcNumber,
                    carrierType: load.booking.carrierCompany.carrierType,
                    isOwnerOperator: load.booking.carrierCompany.isOwnerOperator,
                    fleetTruckCount: load.booking.carrierCompany.fleetTruckCount,
                    fleetTrailerCount: load.booking.carrierCompany.fleetTrailerCount,
                    trailerEquipmentTypes: load.booking.carrierCompany.trailerEquipmentTypes,
                    carrierProfileBlurb: load.booking.carrierCompany.carrierProfileBlurb,
                    factoringEligible: load.booking.carrierCompany.factoringEligible,
                    verificationStatus: load.booking.carrierCompany.verificationStatus,
                    reliabilityScore: null,
                  }}
                  documents={carrierDocs}
                />
              </div>
            )}

            {load.extendedPosting != null && (isShipperOwner || isRealAdmin || isBookedCarrier) && (
              <ExtendedPostingPanel data={load.extendedPosting} className="mt-4" />
            )}

            {load.booking && isShipperOwner && (
              <LoadDateChangePanel
                loadId={load.id}
                mode="supplier"
                currentPickup={load.requestedPickupAt.toISOString()}
                currentDelivery={load.requestedDeliveryAt?.toISOString() ?? null}
              />
            )}
            {load.booking && isBookedCarrier && (
              <LoadDateChangePanel
                loadId={load.id}
                mode="carrier"
                currentPickup={load.requestedPickupAt.toISOString()}
                currentDelivery={load.requestedDeliveryAt?.toISOString() ?? null}
              />
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

            {isBookedCarrier && !load.dispatchLink && load.status === LoadStatus.BOOKED && (
              <CreateDispatchForm loadId={load.id} />
            )}

            {load.dispatchLink && (isShipperOwner || isBookedCarrier || isRealAdmin) && (
              <>
                <FacilitySiteLinksPanel
                  token={load.dispatchLink.token}
                  referenceNumber={load.referenceNumber}
                />
                {(isShipperOwner || isRealAdmin) && (
                  <ShipperConfirmPickup
                    loadId={load.id}
                    referenceNumber={load.referenceNumber}
                    canConfirm={!load.dispatchLink.pickupConfirmedAt}
                    pickupConfirmedAt={load.dispatchLink.pickupConfirmedAt}
                  />
                )}
              </>
            )}

            {load.dispatchLink && (isBookedCarrier || isRealAdmin) && (
              <DriverLinkPanel
                token={load.dispatchLink.token}
                bolStripHref={`/loads/${load.id}/bol-strip`}
                driverName={load.dispatchLink.driverName}
              />
            )}
          </div>
          </div>
        </div>
      </div>
    </main>
  );
}
