"use client";

import Link from "next/link";

import { CarrierTypeTag } from "@/components/carrier-type-tag";
import { LumberSpecPanel } from "@/components/lumber-spec-panel";
import { LOB_BRAND_LOCKUP_SRC } from "@/lib/brand";
import { BRAND_PRODUCT_NAME } from "@/lib/brand-marketing";
import { formatInstant, formatPostedDateWithOptionalTime } from "@/lib/format-posted-datetime";
import {
  extractLoadExecution,
  firstStopTime,
  formatCityLine,
} from "@/lib/load-execution";
import type { LumberSpec } from "@/lib/lumber-spec";

type Props = {
  loadId: string;
  load: {
    referenceNumber: string;
    equipmentType: string;
    weightLbs: number;
    isRush: boolean;
    pickupCity: string;
    pickupState: string;
    pickupZip: string;
    deliveryCity: string;
    deliveryState: string;
    deliveryZip: string;
    requestedPickupAt: string;
    requestedDeliveryAt: string | null;
    bookedAt: string;
    formattedRate: string;
  };
  shipper: { legalName: string };
  carrier: {
    legalName: string;
    dotNumber: string | null;
    mcNumber: string | null;
    carrierType: "ASSET_BASED" | "BROKER" | null;
    isOwnerOperator: boolean;
  };
  completion: {
    pickupConfirmedAt: string;
    carrierDeliveredAt: string;
    supplierDeliveredAt: string;
    signedBolFileUrl: string | null;
    driverName: string | null;
  };
  lumber: LumberSpec | null;
  extendedPosting?: unknown;
};

export function CompletionInvoicePrint({
  loadId,
  load,
  shipper,
  carrier,
  completion,
  lumber,
  extendedPosting,
}: Props) {
  const execution = extractLoadExecution(extendedPosting);
  const formattedPickup = formatPostedDateWithOptionalTime(
    load.requestedPickupAt,
    firstStopTime(execution.pickups),
  );
  const formattedDelivery = formatPostedDateWithOptionalTime(
    load.requestedDeliveryAt,
    firstStopTime(execution.deliveries),
  );

  return (
    <main className="mx-auto min-h-screen max-w-[8.5in] bg-white p-6 text-zinc-900 print:p-0 print:text-[11pt]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link href={`/loads/${loadId}`} className="text-sm text-emerald-700 underline">
          ← Back to load
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
        >
          Print / Save as PDF
        </button>
      </div>

      <article className="rounded-lg border border-zinc-300 bg-white p-8 shadow-sm print:border-0 print:p-0 print:shadow-none">
        <header className="mb-6 flex items-start justify-between border-b border-zinc-200 pb-4">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOB_BRAND_LOCKUP_SRC} alt={BRAND_PRODUCT_NAME} className="mb-3 h-12 w-auto object-contain" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-500">
              Completion invoice
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">Load {load.referenceNumber}</h1>
            <p className="text-sm text-zinc-600">
              Booked {formatInstant(load.bookedAt) ?? "—"} · Mutual delivery confirmed
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase text-zinc-500">Amount due (agreed rate)</p>
            <p className="text-3xl font-bold tabular-nums text-emerald-900">{load.formattedRate}</p>
            <p className="mt-1 text-[10px] text-zinc-500">Attach this PDF in Outlook with your billing package.</p>
          </div>
        </header>

        <section className="mb-6 grid grid-cols-2 gap-6">
          <div className="rounded border border-zinc-200 p-4">
            <h2 className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Bill to (shipper)</h2>
            <p className="mt-1 text-sm font-semibold">{shipper.legalName}</p>
          </div>
          <div className="rounded border border-zinc-200 p-4">
            <h2 className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Carrier</h2>
            <p className="mt-1 text-sm font-semibold">{carrier.legalName}</p>
            <p className="mt-1 text-xs text-zinc-600">
              DOT {carrier.dotNumber ?? "—"} · MC {carrier.mcNumber ?? "—"}
            </p>
            <div className="mt-2">
              <CarrierTypeTag carrierType={carrier.carrierType} isOwnerOperator={carrier.isOwnerOperator} />
            </div>
          </div>
        </section>

        <section className="mb-6 grid grid-cols-2 gap-6">
          <div>
            <h2 className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Origin</h2>
            <p className="mt-1 text-sm font-medium">
              {formatCityLine(load.pickupCity, load.pickupState, load.pickupZip)}
            </p>
            <p className="text-xs text-zinc-600">Requested pickup {formattedPickup}</p>
          </div>
          <div>
            <h2 className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Destination</h2>
            <p className="mt-1 text-sm font-medium">
              {formatCityLine(load.deliveryCity, load.deliveryState, load.deliveryZip)}
            </p>
            <p className="text-xs text-zinc-600">Requested delivery {formattedDelivery ?? "—"}</p>
          </div>
        </section>

        <section className="mb-6 rounded border border-zinc-200 p-4">
          <h2 className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Shipment details</h2>
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div>
              <dt className="text-xs text-zinc-500">Equipment</dt>
              <dd className="font-medium">{load.equipmentType}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">Weight</dt>
              <dd className="font-medium tabular-nums">{load.weightLbs.toLocaleString()} lbs</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">Rush</dt>
              <dd className="font-medium">{load.isRush ? "Yes" : "No"}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">Driver</dt>
              <dd className="font-medium">{completion.driverName ?? "—"}</dd>
            </div>
          </dl>
        </section>

        <section className="mb-6 rounded border border-emerald-200 bg-emerald-50/50 p-4">
          <h2 className="text-[10px] font-semibold uppercase tracking-wide text-emerald-900">Completion</h2>
          <ul className="mt-2 space-y-1 text-sm text-zinc-800">
            <li>Picked up: {formatInstant(completion.pickupConfirmedAt) ?? "—"}</li>
            <li>Carrier delivered: {formatInstant(completion.carrierDeliveredAt) ?? "—"}</li>
            <li>Supplier confirmed: {formatInstant(completion.supplierDeliveredAt) ?? "—"}</li>
          </ul>
          {completion.signedBolFileUrl ? (
            <p className="mt-3 text-sm">
              Signed BOL:{" "}
              <a
                href={completion.signedBolFileUrl}
                className="font-medium text-lob-navy underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                open attachment
              </a>
            </p>
          ) : (
            <p className="mt-3 text-xs text-amber-900">No signed BOL on file yet. Carrier should attach it on the load.</p>
          )}
        </section>

        {lumber ? <LumberSpecPanel spec={lumber} className="mb-6" /> : null}

        <footer className="border-t border-zinc-200 pt-4 text-[10px] text-zinc-500">
          Generated by {BRAND_PRODUCT_NAME}. Not a tax invoice. Use Print / Save as PDF and attach in Outlook for
          billing.
        </footer>
      </article>
    </main>
  );
}
