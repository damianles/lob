"use client";

import { useCallback } from "react";

import { equipmentShortTag } from "@/lib/lumber-equipment";
import { summarizeLumberSpec } from "@/lib/lumber-spec";
import type { LumberSpec } from "@/lib/lumber-spec";
import type { DriverPacket } from "@/lib/driver-packet";

type DispatchSheetPrintProps = {
  referenceNumber: string;
  originLine: string;
  destinationLine: string;
  weightLbs: number;
  equipmentType: string;
  millLabel: string | null;
  carrierName: string | null;
  driverName: string;
  driverPhone?: string | null;
  pickupAt: string | null;
  deliveryAt: string | null;
  pickupCode: string | null;
  lumberSpec?: LumberSpec | null;
  packet: DriverPacket;
};

function fmtDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Print / Save-as-PDF dispatch sheet — fields follow the carrier's packet. No rates. */
export function DispatchSheetPrint(props: DispatchSheetPrintProps) {
  const { packet } = props;
  const onPrint = useCallback(() => {
    window.print();
  }, []);

  const specPills = summarizeLumberSpec(props.lumberSpec ?? null);
  const specText = specPills.length ? specPills.join(" · ") : null;
  const pickupLabel = fmtDate(props.pickupAt);
  const deliveryLabel = fmtDate(props.deliveryAt);

  return (
    <div className="mx-auto max-w-[8.5in] bg-white p-6 text-zinc-900 print:max-w-none print:p-0">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 print:hidden">
        <p className="text-xs text-zinc-500">Print or Save as PDF, then attach in Outlook if you are sending it.</p>
        <button
          type="button"
          onClick={onPrint}
          className="rounded-lg bg-lob-navy px-4 py-2 text-sm font-semibold text-white hover:bg-lob-navy-hover"
        >
          Print / Save as PDF
        </button>
      </div>

      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-500">Lumber One Board</p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight text-stone-900">
        Driver dispatch · {props.referenceNumber}
      </h1>
      <p className="mt-1 text-sm text-stone-600">
        Haul instructions only. Yard and receiver confirm pickup and delivery — not this sheet. No rate.
      </p>

      <dl className="mt-6 grid gap-3 text-sm text-stone-800 sm:grid-cols-2 print:text-[12px]">
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">Driver</dt>
          <dd className="mt-0.5 font-medium">{props.driverName}</dd>
          {props.driverPhone ? <dd className="text-stone-600">{props.driverPhone}</dd> : null}
        </div>
        {packet.include.carrierName && props.carrierName ? (
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">Carrier</dt>
            <dd className="mt-0.5 font-medium">{props.carrierName}</dd>
          </div>
        ) : null}
        {packet.include.lane ? (
          <div className="sm:col-span-2">
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">Lane</dt>
            <dd className="mt-0.5 font-medium">
              {props.originLine} <span className="text-stone-400">→</span> {props.destinationLine}
            </dd>
          </div>
        ) : null}
        {packet.include.dates ? (
          <>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">Pickup</dt>
              <dd className="mt-0.5">{pickupLabel ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">Delivery</dt>
              <dd className="mt-0.5">{deliveryLabel ?? "—"}</dd>
            </div>
          </>
        ) : null}
        {packet.include.equipment ? (
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">Equipment</dt>
            <dd className="mt-0.5 font-medium">{equipmentShortTag(props.equipmentType)}</dd>
          </div>
        ) : null}
        {packet.include.weight ? (
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">Weight</dt>
            <dd className="mt-0.5">{props.weightLbs.toLocaleString()} lb</dd>
          </div>
        ) : null}
        {packet.include.shipperName && props.millLabel ? (
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">Shipper</dt>
            <dd className="mt-0.5">{props.millLabel}</dd>
          </div>
        ) : null}
        {packet.include.pickupCode && props.pickupCode ? (
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">Pickup code</dt>
            <dd className="mt-0.5 font-mono font-semibold">{props.pickupCode}</dd>
          </div>
        ) : null}
        {packet.include.lumber && specText ? (
          <div className="sm:col-span-2">
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">Product</dt>
            <dd className="mt-0.5">{specText}</dd>
          </div>
        ) : null}
        {packet.notes ? (
          <div className="sm:col-span-2 rounded-lg border border-stone-200 bg-stone-50 p-3">
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">Dispatcher notes</dt>
            <dd className="mt-1 whitespace-pre-wrap">{packet.notes}</dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}
