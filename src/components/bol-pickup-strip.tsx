"use client";

import { QRCodeSVG } from "qrcode.react";
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
  /** Full URL for pickup QR; include ?code= when a pickup code exists. */
  pickupScanUrl: string;
  lumberSpec?: LumberSpec | null;
  /** Renders a minimal shell (e.g. signed-in app). When false, public print page. */
  inApp?: boolean;
};

/**
 * Print-friendly pickup / BOL strip: large QR (driver scans to confirm origin pickup).
 * Shippers attach to paperwork; drivers scan with the device camera.
 */
export function BolPickupStrip({
  referenceNumber,
  originLine,
  destinationLine,
  weightLbs,
  equipmentType,
  millLabel,
  pickupScanUrl,
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
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-stone-900">Pickup · {referenceNumber}</h1>
        <p className="mt-1 text-sm text-stone-600">Attach to BOL or shipping documents. Driver scans to confirm load-out.</p>

        <div className="mt-6 flex flex-col items-center rounded-2xl border border-stone-200 bg-white px-4 py-6 sm:px-8">
          <p className="text-xs font-medium uppercase text-stone-500">Scan for pickup</p>
          <div className="mt-3 print:mt-2">
            <QRCodeSVG value={pickupScanUrl} size={200} level="H" className="print:h-48 print:w-48" />
          </div>
          <p className="mt-3 max-w-xs text-center text-xs leading-relaxed text-stone-600 print:text-[11px]">
            Opens the LOB confirmation page. Your pickup code is included—tap <span className="font-semibold">Confirm</span>{" "}
            when freight is on the truck.
          </p>
        </div>

        <div className="mt-6 space-y-1.5 text-sm text-stone-800 print:text-[12px]">
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

        <p className="mt-6 break-all text-[10px] text-stone-400 print:text-[8px]">{pickupScanUrl}</p>

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
