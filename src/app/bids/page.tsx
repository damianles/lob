import { LoadBidStatus, LoadRateMode, LoadStatus } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";

import { BidWithdrawButton } from "@/components/bid-withdraw-button";
import { CarrierRateActions } from "@/components/carrier-rate-actions";
import { LobBrandStrip } from "@/components/lob-brand-strip";
import { LobSidebar } from "@/components/lob-sidebar";
import { RateModeBadge } from "@/components/rate-mode-badge";
import { ShipperBidReviewList } from "@/components/shipper-bid-review-list";
import { fetchPostedLoadVisibilityContext, postedLoadVisibleToCarrier } from "@/lib/carrier-load-access";
import { expireStaleBids } from "@/lib/load-bids";
import { formatMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { OPEN_BID_LABEL } from "@/lib/rate-mode";
import { getActorContext } from "@/lib/request-context";

export const dynamic = "force-dynamic";

function lane(l: { originCity: string; originState: string; destinationCity: string; destinationState: string }) {
  return `${l.originCity}, ${l.originState} → ${l.destinationCity}, ${l.destinationState}`;
}

export default async function OpenBidsPage() {
  const actor = await getActorContext();
  if (!actor.userId) {
    redirect("/sign-in");
  }
  if (!actor.companyId && actor.realRole !== "ADMIN") {
    redirect("/onboarding");
  }

  await expireStaleBids();

  const isShipper = actor.role === "SHIPPER" && Boolean(actor.companyId);
  const isCarrier = actor.role === "DISPATCHER" || actor.role === "ADMIN";

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-lob-paper text-stone-900">
      <div className="mx-auto flex max-w-[1600px] gap-0 rounded-lg border border-zinc-200 bg-white shadow-sm">
        <LobSidebar active="openBids" />
        <div className="min-w-0 flex-1">
          <LobBrandStrip />
          <div className="p-6 lg:p-8">
            <h1 className="text-2xl font-bold text-zinc-900">Open Bids</h1>
            <p className="mt-1 max-w-2xl text-sm text-zinc-600">
              {isShipper
                ? `${OPEN_BID_LABEL} loads and Take-it counters waiting on you. Accept a bid to book at that amount.`
                : `${OPEN_BID_LABEL} freight and any bids or counters you have in play.`}
            </p>
            {isShipper ? <ShipperOpenBids companyId={actor.companyId!} /> : null}
            {isCarrier && actor.companyId ? <CarrierOpenBids companyId={actor.companyId} /> : null}
          </div>
        </div>
      </div>
    </main>
  );
}

async function ShipperOpenBids({ companyId }: { companyId: string }) {
  const loads = await prisma.load.findMany({
    where: {
      shipperCompanyId: companyId,
      status: LoadStatus.POSTED,
      OR: [{ rateMode: LoadRateMode.OPEN_BID }, { rateMode: LoadRateMode.TAKE_IT, allowCounterOffers: true }],
    },
    orderBy: [{ bidWindowExpiresAt: "asc" }, { createdAt: "desc" }],
    include: {
      bids: {
        where: { status: LoadBidStatus.PENDING },
        orderBy: { createdAt: "desc" },
        include: { carrierCompany: { select: { legalName: true } } },
      },
    },
    take: 80,
  });

  if (loads.length === 0) {
    return (
      <p className="mt-6 text-sm text-zinc-600">
        No open-bid or counter-enabled loads right now.{" "}
        <Link href="/shipments" className="font-medium text-lob-navy underline">
          Post a load
        </Link>{" "}
        and choose {OPEN_BID_LABEL} or Take-it with counters.
      </p>
    );
  }

  return (
    <div className="mt-6 space-y-6">
      {loads.map((l) => (
        <section key={l.id} className="rounded-xl border border-stone-200 bg-stone-50/50 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/loads/${l.id}`} className="font-semibold text-lob-navy underline">
              {l.referenceNumber}
            </Link>
            <RateModeBadge rateMode={l.rateMode} allowCounterOffers={l.allowCounterOffers} />
          </div>
          <p className="mt-1 text-sm text-zinc-700">{lane(l)}</p>
          <p className="text-xs text-zinc-500">
            Pickup {l.requestedPickupAt.toLocaleDateString()}
            {l.bidWindowExpiresAt ? ` · bidding ends ${l.bidWindowExpiresAt.toLocaleString()}` : ""}
            {l.offeredRateUsd != null ? ` · posted ${formatMoney(Number(l.offeredRateUsd), l.offerCurrency)}` : ""}
          </p>
          <div className="mt-4">
            <ShipperBidReviewList
              bids={l.bids.map((b) => ({
                id: b.id,
                kind: b.kind,
                amountUsd: Number(b.amountUsd),
                currency: b.currency,
                note: b.note,
                expiresAt: b.expiresAt.toISOString(),
                createdAt: b.createdAt.toISOString(),
                carrierName: b.carrierCompany.legalName,
              }))}
            />
          </div>
        </section>
      ))}
    </div>
  );
}

async function CarrierOpenBids({ companyId }: { companyId: string }) {
  const [openBidLoads, myBids] = await Promise.all([
    prisma.load.findMany({
      where: { status: LoadStatus.POSTED, rateMode: LoadRateMode.OPEN_BID },
      orderBy: [{ bidWindowExpiresAt: "asc" }, { createdAt: "desc" }],
      include: {
        bids: {
          where: { carrierCompanyId: companyId, status: LoadBidStatus.PENDING },
          take: 1,
        },
      },
      take: 80,
    }),
    prisma.loadBid.findMany({
      where: { carrierCompanyId: companyId },
      orderBy: { createdAt: "desc" },
      take: 40,
      include: {
        load: {
          select: {
            id: true,
            referenceNumber: true,
            originCity: true,
            originState: true,
            destinationCity: true,
            destinationState: true,
            offerCurrency: true,
            status: true,
            shipperCompanyId: true,
            carrierVisibilityMode: true,
          },
        },
      },
    }),
  ]);

  const posted = openBidLoads.map((l) => ({
    id: l.id,
    shipperCompanyId: l.shipperCompanyId,
    carrierVisibilityMode: l.carrierVisibilityMode,
  }));
  const ctx = posted.length ? await fetchPostedLoadVisibilityContext(prisma, companyId, posted) : null;
  const visibleLoads = ctx
    ? openBidLoads.filter((l) =>
        postedLoadVisibleToCarrier(
          { id: l.id, shipperCompanyId: l.shipperCompanyId, carrierVisibilityMode: l.carrierVisibilityMode },
          ctx,
        ),
      )
    : [];

  return (
    <div className="mt-6 space-y-8">
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">{OPEN_BID_LABEL} on the board</h2>
        {visibleLoads.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-600">
            No open-bid loads you can see right now. Check Open Loads for Take-it freight.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-stone-100 rounded-xl border border-stone-200 bg-white">
            {visibleLoads.map((l) => (
              <li key={l.id} className="flex flex-wrap items-start justify-between gap-4 px-4 py-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/loads/${l.id}`} className="font-semibold text-lob-navy underline">
                      {l.referenceNumber}
                    </Link>
                    <RateModeBadge rateMode={l.rateMode} allowCounterOffers={l.allowCounterOffers} />
                  </div>
                  <p className="mt-1 text-sm text-zinc-700">{lane(l)}</p>
                  <p className="text-xs text-zinc-500">
                    {l.bidWindowExpiresAt ? `Ends ${l.bidWindowExpiresAt.toLocaleString()}` : "Open until accepted"}
                    {l.offeredRateUsd != null
                      ? ` · target ${formatMoney(Number(l.offeredRateUsd), l.offerCurrency)}`
                      : ""}
                  </p>
                </div>
                <CarrierRateActions
                  loadId={l.id}
                  offerCurrency={l.offerCurrency}
                  offeredRateUsd={l.offeredRateUsd != null ? Number(l.offeredRateUsd) : null}
                  rateMode="OPEN_BID"
                  allowCounterOffers={false}
                  bidWindowExpiresAt={l.bidWindowExpiresAt?.toISOString() ?? null}
                  myPendingAmount={l.bids[0] ? Number(l.bids[0].amountUsd) : null}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Your bids &amp; counters</h2>
        {myBids.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-600">You have not submitted any bids yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-stone-100 rounded-xl border border-stone-200 bg-white">
            {myBids.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <Link href={`/loads/${b.load.id}`} className="font-semibold text-lob-navy underline">
                    {b.load.referenceNumber}
                  </Link>
                  <p className="text-sm text-zinc-700">{lane(b.load)}</p>
                  <p className="text-xs text-zinc-500">
                    {formatMoney(Number(b.amountUsd), b.currency)} · {b.status.toLowerCase()} · {b.kind.toLowerCase()}
                  </p>
                </div>
                {b.status === LoadBidStatus.PENDING ? <BidWithdrawButton bidId={b.id} /> : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
