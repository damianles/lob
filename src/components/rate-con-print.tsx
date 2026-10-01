"use client";

import Link from "next/link";

import { CarrierTypeTag } from "@/components/carrier-type-tag";
import { LOB_BRAND_LOCKUP_SRC } from "@/lib/brand";
import { BRAND_PRODUCT_NAME } from "@/lib/brand-marketing";
import { formatInstant, formatPostedDateWithOptionalTime } from "@/lib/format-posted-datetime";
import {
  extractLoadExecution,
  firstStopTime,
  formatCityLine,
  formatLocationLines,
} from "@/lib/load-execution";
import { summarizeLumberSpec, type LumberSpec } from "@/lib/lumber-spec";

type LoadInfo = {
  id: string;
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
  requestedDeliveryAt?: string | null;
  bookedAt: string;
  formattedRate: string;
  agreedCurrency: "USD" | "CAD";
};

type Props = {
  load: LoadInfo;
  shipper: { legalName: string; businessPhone: string | null };
  carrier: {
    legalName: string;
    businessPhone: string | null;
    dotNumber: string | null;
    mcNumber: string | null;
    carrierType: "ASSET_BASED" | "BROKER" | null;
    isOwnerOperator: boolean;
  };
  lumber: LumberSpec | null;
  extendedPosting?: unknown;
};

/**
 * Browser-printable Rate Confirmation — one commercial page.
 * Print / Save as PDF; attach in Outlook. No PDF library.
 */
export function RateConPrint({ load, shipper, carrier, lumber, extendedPosting }: Props) {
  const execution = extractLoadExecution(extendedPosting);
  const formattedPickup = formatPostedDateWithOptionalTime(load.requestedPickupAt, firstStopTime(execution.pickups));
  const formattedDelivery = formatPostedDateWithOptionalTime(
    load.requestedDeliveryAt ?? null,
    firstStopTime(execution.deliveries),
  );
  const formattedBooked = formatInstant(load.bookedAt);
  const productLine = summarizeLumberSpec(lumber).join(" · ") || null;

  const refs = [
    execution.shipRef && `Ship ref ${execution.shipRef}`,
    execution.poNumber && `PO ${execution.poNumber}`,
    execution.customerOrderNo && `Customer order ${execution.customerOrderNo}`,
    execution.customerName && `Customer ${execution.customerName}`,
  ].filter(Boolean) as string[];

  const pickupPhone = execution.pickups.find((s) => s.phone)?.phone ?? null;
  const deliveryPhone = execution.deliveries.find((s) => s.phone)?.phone ?? null;

  return (
    <main className="mx-auto min-h-screen max-w-[8.5in] bg-white p-6 text-zinc-900 print:p-0 print:text-[11pt]">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link href={`/loads/${load.id}`} className="text-sm text-lob-navy underline">
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
        <header className="mb-5 flex items-start justify-between gap-4 border-b border-zinc-200 pb-4">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOB_BRAND_LOCKUP_SRC} alt={BRAND_PRODUCT_NAME} className="mb-3 h-12 w-auto object-contain" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-500">Rate confirmation</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">Load {load.referenceNumber}</h1>
            {formattedBooked ? <p className="text-sm text-zinc-600">Booked {formattedBooked}</p> : null}
            {refs.length ? <p className="mt-1 text-xs text-zinc-700">{refs.join(" · ")}</p> : null}
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase text-zinc-500">Agreed rate</p>
            <p className="text-3xl font-bold tabular-nums text-emerald-900">{load.formattedRate}</p>
            <p className="mt-1 max-w-[11rem] text-[10px] text-zinc-500">
              All-in. Detention / lumper / accessorials only with prior written consent.
            </p>
          </div>
        </header>

        <p className="mb-5 text-[10px] leading-relaxed text-zinc-500">
          {BRAND_PRODUCT_NAME} facilitates the marketplace and this confirmation. LOB is not the broker of record and is
          not a party to the haul contract between shipper and carrier.
        </p>

        <section className="mb-5 grid grid-cols-2 gap-5">
          <div className="rounded border border-zinc-200 p-3">
            <h2 className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Shipper</h2>
            <p className="mt-1 text-sm font-semibold">{shipper.legalName}</p>
            {shipper.businessPhone ? (
              <p className="mt-1 text-xs text-zinc-700">Ops {shipper.businessPhone}</p>
            ) : pickupPhone ? (
              <p className="mt-1 text-xs text-zinc-700">Pickup {pickupPhone}</p>
            ) : (
              <p className="mt-1 text-xs text-zinc-500">No shipper phone on file</p>
            )}
          </div>
          <div className="rounded border border-zinc-200 p-3">
            <h2 className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Carrier</h2>
            <p className="mt-1 text-sm font-semibold">{carrier.legalName}</p>
            <p className="mt-1 text-xs text-zinc-600">
              DOT {carrier.dotNumber ?? "—"} · MC {carrier.mcNumber ?? "—"}
            </p>
            {carrier.businessPhone ? (
              <p className="mt-1 text-xs text-zinc-700">Dispatch {carrier.businessPhone}</p>
            ) : null}
            <div className="mt-2">
              <CarrierTypeTag carrierType={carrier.carrierType} isOwnerOperator={carrier.isOwnerOperator} />
            </div>
          </div>
        </section>

        <section className="mb-5 grid grid-cols-2 gap-5">
          <div>
            <h2 className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Pickup</h2>
            {formattedPickup ? <p className="mt-1 text-xs text-zinc-600">{formattedPickup}</p> : null}
            {formatLocationLines(
              formatCityLine(load.pickupCity, load.pickupState, load.pickupZip),
              execution.pickups,
              "pickup",
            ).map((line) => (
              <p key={line} className="mt-0.5 text-sm font-semibold text-zinc-900">
                {line}
              </p>
            ))}
            {load.isRush ? (
              <p className="mt-1 inline-block rounded bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-900">
                Rush
              </p>
            ) : null}
          </div>
          <div>
            <h2 className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Delivery</h2>
            {formattedDelivery ? <p className="mt-1 text-xs text-zinc-600">{formattedDelivery}</p> : null}
            {formatLocationLines(
              formatCityLine(load.deliveryCity, load.deliveryState, load.deliveryZip),
              execution.deliveries,
              "delivery",
            ).map((line) => (
              <p key={line} className="mt-0.5 text-sm font-semibold text-zinc-900">
                {line}
              </p>
            ))}
            {deliveryPhone && !execution.deliveries.some((s) => s.phone) ? (
              <p className="mt-1 text-xs text-zinc-600">{deliveryPhone}</p>
            ) : null}
          </div>
        </section>

        <section className="mb-5 grid grid-cols-3 gap-3 rounded border border-zinc-200 p-3 text-sm">
          <div>
            <p className="text-[10px] font-semibold uppercase text-zinc-500">Equipment</p>
            <p className="mt-0.5 font-medium">{load.equipmentType}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase text-zinc-500">Weight</p>
            <p className="mt-0.5 font-medium tabular-nums">{load.weightLbs.toLocaleString()} lbs</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase text-zinc-500">Product</p>
            <p className="mt-0.5 font-medium">{productLine ?? "See haul sheet"}</p>
          </div>
        </section>

        <section className="mb-5 rounded border border-zinc-200 p-3 text-xs leading-relaxed text-zinc-700">
          <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Standard terms</h2>
          <ol className="ml-4 list-decimal space-y-1">
            <li>
              Carrier shall transport the freight described above safely and in compliance with applicable law for the
              jurisdictions of this haul (US and/or Canada).
            </li>
            <li>
              Driver must call shipper ops at least 1 hour before pickup. Clean POD and the mill&apos;s signed BOL / shipping
              papers are required for payment.
            </li>
            <li>Detention, layover, and accessorials only with prior written approval and supporting documentation.</li>
            <li>Double-brokering is prohibited. Breach of this term voids this confirmation and may forfeit payment.</li>
            <li>
              Carrier represents that operating authority and insurance on file with LOB (and as required by the shipper)
              remain current for the haul. Coverage amounts are those on the filed certificate, not restated here.
            </li>
          </ol>
        </section>

        <footer className="mt-6 grid grid-cols-2 gap-8 border-t border-zinc-200 pt-4 text-xs">
          <div>
            <p className="font-semibold text-zinc-700">Shipper signature / date</p>
            <div className="mt-6 h-px w-full bg-zinc-400" />
          </div>
          <div>
            <p className="font-semibold text-zinc-700">Carrier signature / date</p>
            <div className="mt-6 h-px w-full bg-zinc-400" />
          </div>
        </footer>

        <p className="mt-4 text-center text-[10px] text-zinc-400">{BRAND_PRODUCT_NAME} · Rate confirmation</p>
      </article>
    </main>
  );
}
