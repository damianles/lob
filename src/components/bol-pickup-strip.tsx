"use client";

import { useCallback } from "react";

import { equipmentShortTag } from "@/lib/lumber-equipment";
import { summarizeLumberSpec } from "@/lib/lumber-spec";
import type { LumberSpec } from "@/lib/lumber-spec";

type BolPickupStripProps = {
  referenceNumber: string;
  originLine: string;
  destinationLine: string;
  weightLbs: number;
  equipmentType: string;
  millLabel: string | null;
  driverName?: string | null;
  lumberSpec?: LumberSpec | null;
  /** Renders a minimal shell (e.g. signed-in app). When false, public print page. */
  inApp?: boolean;
};

/** Print-friendly haul sheet for the driver — route and freight only, no confirm QR. */
export function BolPickupStrip({
  referenceNumber,
  originLine,
  destinationLine,
  weightLbs,
  equipmentType,
  millLabel,
  driverName,
  lumberSpec,
  inApp = false,
}: BolPickupStripProps) {
  const onPrint = useCallback(() => {
    window.print();
  }, []);

  const specPills = summarizeLumberSpec(lumberSpec ?? null);
  const specText = specPills.length ? specPills.join(" · ") : null;

  const shell = inApp
    ? "rounded-2xl border border-stone-200/80 bg-gradient-to-b from-white to-stone-50/60 p-5 shadow-[0_1px_0_rgba(0,0,0,0.04)]"
    : "min-h-screen bg-white px-4 py-8 sm:px-8";

  return (
    <div className={shell}>
      <div className="mx-auto max-w-md print:max-w-none print:px-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-500">Lumber on Board</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-stone-900">Driver haul sheet · {referenceNumber}</h1>
        <p className="mt-1 text-sm text-stone-600">
          Attach to paperwork for the driver. Pickup and delivery confirmation use yard/receiver links — not this sheet.
        </p>

        <div className="mt-6 space-y-1.5 text-sm text-stone-800 print:text-[12px]">
          {driverName && (
            <p>
              <span className="text-stone-500">Driver </span>
              {driverName}
            </p>
          )}
          <p>
            <span className="text-stone-500">Route </span>
            {originLine} <span className="text-stone-400">→</span> {destinationLine}
          </p>
          <p>
            <span className="text-stone-500">Equipment </span>
            <span className="font-medium">{equipmentShortTag(equipmentType)}</span>
            <span className="text-stone-400"> · </span>
            {weightLbs.toLocaleString()} lb
          </p>
          {millLabel && (
            <p>
              <span className="text-stone-500">Origin </span>
              {millLabel}
            </p>
          )}
          {specText && (
            <p>
              <span className="text-stone-500">Product </span>
              {specText}
            </p>
          )}
        </div>

        <div className="mt-6 flex flex-wrap gap-2 print:hidden">
          <button
            type="button"
            onClick={onPrint}
            className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-lob-navy px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-lob-navy-hover"
          >
            Print for paperwork
          </button>
        </div>
      </div>
    </div>
  );
}
