"use client";

import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";

function appendPickupCodeParam(baseUrl: string, pickupCode: string | null | undefined) {
  if (!pickupCode) return baseUrl;
  const sep = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${sep}code=${encodeURIComponent(pickupCode)}`;
}

export function DispatchQrPanel({
  pickupUrl,
  deliveryUrl,
  driverUrl,
  pickupCode,
  bolStripHref,
}: {
  pickupUrl: string;
  deliveryUrl: string;
  driverUrl: string;
  /** When set, encoded on the Pickup QR so a scan opens the page with the code prefilled. */
  pickupCode?: string | null;
  /** Link to a print-friendly BOL / pickup page (load detail). */
  bolStripHref?: string;
}) {
  const pickupScanUrl = appendPickupCodeParam(pickupUrl, pickupCode);
  return (
    <section className="mt-4 rounded-2xl border border-stone-200/90 bg-gradient-to-b from-white to-stone-50/40 p-4 text-sm shadow-sm">
      <h3 className="font-semibold text-zinc-900">QR for dock &amp; paper</h3>
      {bolStripHref && (
        <p className="mt-2 text-xs text-stone-600">
          <Link href={bolStripHref} className="font-medium text-lob-navy underline decoration-lob-gold/30">
            Printable BOL / pickup sheet
          </Link>{" "}
          (attach to shipping documents; same QR and link as below).
        </p>
      )}
      <p className="mt-1 text-xs text-zinc-600 leading-relaxed">
        <strong>Pickup:</strong> the driver or gate scans the Pickup QR when the truck is loaded. The code is
        pre-filled; tap confirm to move the load in transit. <strong>Delivery:</strong> receiver scan for delivery
        and POD. No LOB account required.
      </p>
      <div className="mt-4 grid gap-6 sm:grid-cols-3">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase text-stone-500">Pickup (ship / driver)</p>
          <div className="mt-2 flex justify-center">
            <QRCodeSVG value={pickupScanUrl} size={140} level="H" />
          </div>
          <p className="mt-2 break-all text-[10px] text-zinc-500">{pickupScanUrl}</p>
        </div>
        <div className="text-center">
          <p className="text-xs font-semibold uppercase text-zinc-500">Delivery scan</p>
          <div className="mt-2 flex justify-center">
            <QRCodeSVG value={deliveryUrl} size={140} level="M" />
          </div>
          <p className="mt-2 break-all text-[10px] text-zinc-500">{deliveryUrl}</p>
        </div>
        <div className="text-center">
          <p className="text-xs font-semibold uppercase text-zinc-500">Driver link</p>
          <div className="mt-2 flex justify-center">
            <QRCodeSVG value={driverUrl} size={140} level="M" />
          </div>
          <p className="mt-2 break-all text-[10px] text-zinc-500">{driverUrl}</p>
        </div>
      </div>
    </section>
  );
}
