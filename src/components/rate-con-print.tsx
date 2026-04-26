"use client";

import Link from "next/link";

import { CarrierTypeTag } from "@/components/carrier-type-tag";
import { LumberSpecPanel } from "@/components/lumber-spec-panel";
import type { LumberSpec } from "@/lib/lumber-spec";

type LoadInfo = {
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
  bookedAt: string;
  formattedRate: string;
  agreedRate: number;
  agreedCurrency: "USD" | "CAD";
};

type Props = {
  load: LoadInfo;
  shipper: { legalName: string };
  carrier: {
    legalName: string;
    dotNumber: string | null;
    mcNumber: string | null;
    carrierType: "ASSET_BASED" | "BROKER" | null;
    isOwnerOperator: boolean;
    fleetTruckCount: number | null;
    fleetTrailerCount: number | null;
  };
  lumber: LumberSpec | null;
};

/**
 * Browser-printable Rate Confirmation. Users hit ⌘P / Ctrl+P or the
 * "Save as PDF" button (which simply triggers print). Designed to look
 * good on letter and to hide the navigation chrome via the .print:hidden
 * convention. We avoid PDF libraries entirely — browser print is the
 * lingua franca of trucking dispatch offices.
 */
export function RateConPrint({ load, shipper, carrier, lumber }: Props) {
  const formattedPickup = new Date(load.requestedPickupAt).toLocaleString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const formattedBooked = new Date(load.bookedAt).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <main className="mx-auto min-h-screen max-w-[8.5in] bg-white p-6 text-zinc-900 print:p-0 print:text-[11pt]">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link href={`/loads/${load.referenceNumber}`} className="text-sm text-emerald-700 underline">
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
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-800">
              Lumber One Board · Rate Confirmation
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">
              Load {load.referenceNumber}
            </h1>
            <p className="text-sm text-zinc-600">
              Booked {formattedBooked} · Pickup {formattedPickup}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase text-zinc-500">Agreed rate</p>
            <p className="text-3xl font-bold tabular-nums text-emerald-900">{load.formattedRate}</p>
            <p className="mt-1 text-[10px] text-zinc-500">
              All-in. Detention/lumper extra only with prior written consent.
            </p>
          </div>
        </header>

        <section className="mb-6 grid grid-cols-2 gap-6">
          <div className="rounded border border-zinc-200 p-4">
            <h2 className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Shipper / Broker</h2>
            <p className="mt-1 text-sm font-semibold">{shipper.legalName}</p>
            <p className="mt-2 text-xs text-zinc-600">Listed on Lumber One Board.</p>
          </div>
          <div className="rounded border border-zinc-200 p-4">
            <h2 className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Carrier</h2>
            <p className="mt-1 text-sm font-semibold">{carrier.legalName}</p>
            <p className="mt-1 text-xs text-zinc-600">
              DOT {carrier.dotNumber ?? "—"} · MC {carrier.mcNumber ?? "—"}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <CarrierTypeTag carrierType={carrier.carrierType} isOwnerOperator={carrier.isOwnerOperator} />
              {carrier.fleetTruckCount != null && (
                <span className="text-[10px] text-zinc-500">
                  {carrier.fleetTruckCount} trucks · {carrier.fleetTrailerCount ?? "—"} trailers
                </span>
              )}
            </div>
          </div>
        </section>

        <section className="mb-6 grid grid-cols-2 gap-6">
          <div>
            <h2 className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Pickup</h2>
            <p className="mt-1 text-sm font-semibold">
              {load.pickupCity}, {load.pickupState} {load.pickupZip}
            </p>
            <p className="mt-1 text-xs text-zinc-600">{formattedPickup}</p>
            {load.isRush && (
              <p className="mt-1 inline-block rounded bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-900">
                RUSH
              </p>
            )}
          </div>
          <div>
            <h2 className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Delivery</h2>
            <p className="mt-1 text-sm font-semibold">
              {load.deliveryCity}, {load.deliveryState} {load.deliveryZip}
            </p>
            <p className="mt-1 text-xs text-zinc-600">As scheduled with shipper.</p>
          </div>
        </section>

        <section className="mb-6 grid grid-cols-3 gap-4 rounded border border-zinc-200 p-4 text-sm">
          <div>
            <p className="text-[10px] font-semibold uppercase text-zinc-500">Equipment</p>
            <p className="mt-0.5 font-medium">{load.equipmentType}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase text-zinc-500">Weight</p>
            <p className="mt-0.5 font-medium tabular-nums">
              {load.weightLbs.toLocaleString()} lbs
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase text-zinc-500">Rate</p>
            <p className="mt-0.5 font-medium tabular-nums">
              {load.agreedRate.toLocaleString("en-US", { style: "currency", currency: load.agreedCurrency, maximumFractionDigits: 0 })}
            </p>
          </div>
        </section>

        {lumber && <LumberSpecPanel spec={lumber} className="mb-6" />}

        <section className="mb-6 rounded border border-zinc-200 p-4 text-xs leading-relaxed text-zinc-700">
          <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Standard terms</h2>
          <ol className="ml-4 list-decimal space-y-1">
            <li>Carrier shall transport the freight described above safely and in compliance with all applicable FMCSA regulations.</li>
            <li>Driver must call Shipper at least 1 hour before pickup. POD &amp; clean BOL required for payment.</li>
            <li>Detention, layover, and accessorials only paid with prior written approval and supporting documentation.</li>
            <li>Double-brokering is strictly prohibited. Any breach voids this confirmation and forfeits payment.</li>
            <li>Carrier confirms active auto liability ($1M), cargo ($100k+ for lumber), and W-9 on file with shipper.</li>
          </ol>
        </section>

        <footer className="mt-8 grid grid-cols-2 gap-8 border-t border-zinc-200 pt-4 text-xs">
          <div>
            <p className="font-semibold text-zinc-700">Shipper signature / date</p>
            <div className="mt-6 h-px w-full bg-zinc-400" />
          </div>
          <div>
            <p className="font-semibold text-zinc-700">Carrier signature / date</p>
            <div className="mt-6 h-px w-full bg-zinc-400" />
          </div>
        </footer>

        <p className="mt-4 text-center text-[10px] text-zinc-400">
          Generated by Lumber One Board · {new Date().toLocaleString()}
        </p>
      </article>
    </main>
  );
}
