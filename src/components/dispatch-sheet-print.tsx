"use client";

import { useCallback, type ReactNode } from "react";

import { LOB_BRAND_LOCKUP_SRC } from "@/lib/brand";
import { BRAND_PRODUCT_NAME } from "@/lib/brand-marketing";
import type { DriverPacket } from "@/lib/driver-packet";
import { formatInstant, formatPostedDateWithOptionalTime } from "@/lib/format-posted-datetime";
import {
  extractLoadExecution,
  firstStopTime,
  formatLocationLines,
  type LoadExecutionDetails,
} from "@/lib/load-execution";
import { equipmentShortTag } from "@/lib/lumber-equipment";
import { summarizeLumberSpec } from "@/lib/lumber-spec";
import type { LumberSpec } from "@/lib/lumber-spec";

type DispatchSheetPrintProps = {
  referenceNumber: string;
  originLine: string;
  destinationLine: string;
  weightLbs: number;
  equipmentType: string;
  millLabel: string | null;
  carrierName: string | null;
  bookedAt?: string | null;
  driverName: string;
  driverPhone?: string | null;
  pickupAt: string | null;
  deliveryAt: string | null;
  lumberSpec?: LumberSpec | null;
  packet: DriverPacket;
  extendedPosting?: unknown;
  execution?: LoadExecutionDetails | null;
};

function Field({ label, children }: { label: string; children: ReactNode }) {
  if (children == null || children === "") return null;
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">{label}</dt>
      <dd className="mt-0.5 whitespace-pre-wrap font-medium text-stone-900">{children}</dd>
    </div>
  );
}

/** Print / Save-as-PDF dispatch sheet — full mill details + booking. No rates. */
export function DispatchSheetPrint(props: DispatchSheetPrintProps) {
  const onPrint = useCallback(() => {
    window.print();
  }, []);

  const execution = props.execution ?? extractLoadExecution(props.extendedPosting);
  const specPills = summarizeLumberSpec(props.lumberSpec ?? null);
  const specText = specPills.length ? specPills.join(" · ") : null;
  const pickupLabel = formatPostedDateWithOptionalTime(props.pickupAt, firstStopTime(execution.pickups));
  const deliveryLabel = formatPostedDateWithOptionalTime(props.deliveryAt, firstStopTime(execution.deliveries));
  const bookedLabel = formatInstant(props.bookedAt ?? null);

  const refs = [
    execution.shipRef && `Ship ref: ${execution.shipRef}`,
    execution.customerOrderNo && `Customer order: ${execution.customerOrderNo}`,
    execution.poNumber && `PO: ${execution.poNumber}`,
    execution.customerName && `Customer: ${execution.customerName}`,
  ].filter(Boolean) as string[];

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

      <header className="flex items-start justify-between gap-4 border-b border-stone-200 pb-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={LOB_BRAND_LOCKUP_SRC} alt={BRAND_PRODUCT_NAME} className="h-14 w-auto object-contain" />
        <p className="text-right text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-500">
          Driver dispatch
        </p>
      </header>

      <h1 className="mt-4 text-2xl font-bold tracking-tight text-stone-900">Load {props.referenceNumber}</h1>
      {refs.length ? <p className="mt-1 text-sm text-stone-700">{refs.join(" · ")}</p> : null}

      <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 print:text-[12px]">
        <Field label="Shipper / mill">{props.millLabel}</Field>
        <Field label="Booked carrier">
          {props.carrierName}
          {bookedLabel ? `\nBooked ${bookedLabel}` : null}
        </Field>
        <Field label="Driver">
          {props.driverName}
          {props.driverPhone ? `\n${props.driverPhone}` : null}
        </Field>
        {execution.ftlLtl ? <Field label="Mode">{execution.ftlLtl}</Field> : null}
        <Field label="Equipment">{equipmentShortTag(props.equipmentType)}</Field>
        <Field label="Weight">{`${props.weightLbs.toLocaleString()} lb`}</Field>

        <div className="sm:col-span-2">
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">Pickup</dt>
          {pickupLabel ? <dd className="mt-0.5 text-stone-600">{pickupLabel}</dd> : null}
          {formatLocationLines(props.originLine, execution.pickups).map((line) => (
            <dd key={line} className="mt-0.5 font-medium text-stone-900">
              {line}
            </dd>
          ))}
        </div>

        <div className="sm:col-span-2">
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">Delivery</dt>
          {deliveryLabel ? <dd className="mt-0.5 text-stone-600">{deliveryLabel}</dd> : null}
          {formatLocationLines(props.destinationLine, execution.deliveries).map((line) => (
            <dd key={line} className="mt-0.5 font-medium text-stone-900">
              {line}
            </dd>
          ))}
        </div>

        {specText ? (
          <div className="sm:col-span-2">
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">Product</dt>
            <dd className="mt-0.5">{specText}</dd>
          </div>
        ) : null}

        {execution.pickupNotes ? <Field label="Pickup instructions">{execution.pickupNotes}</Field> : null}
        {execution.deliveryNotes ? <Field label="Delivery instructions">{execution.deliveryNotes}</Field> : null}
        {execution.notes ? (
          <div className="sm:col-span-2">
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">Mill notes</dt>
            <dd className="mt-0.5 whitespace-pre-wrap">{execution.notes}</dd>
          </div>
        ) : null}

        {props.packet.notes ? (
          <div className="sm:col-span-2 rounded-lg border border-stone-200 bg-stone-50 p-3">
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">Dispatcher notes</dt>
            <dd className="mt-1 whitespace-pre-wrap">{props.packet.notes}</dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}
