"use client";

import { QRCodeSVG } from "qrcode.react";

export function DispatchQrPanel({
  pickupUrl,
  deliveryUrl,
  driverUrl,
}: {
  pickupUrl: string;
  deliveryUrl: string;
  driverUrl: string;
}) {
  return (
    <section className="mt-4 rounded-lg border border-zinc-200 bg-white p-4 text-sm">
      <h3 className="font-semibold text-zinc-900">QR codes for the dock</h3>
      <p className="mt-1 text-xs text-zinc-600">
        <strong>Pickup:</strong> shipper or pickup site scans → enters pickup code → load moves to in transit.{" "}
        <strong>Delivery:</strong> receiver scans → confirms delivery (POD optional). No LOB account required.
      </p>
      <div className="mt-4 grid gap-6 sm:grid-cols-3">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase text-zinc-500">Pickup scan</p>
          <div className="mt-2 flex justify-center">
            <QRCodeSVG value={pickupUrl} size={140} level="M" />
          </div>
          <p className="mt-2 break-all text-[10px] text-zinc-500">{pickupUrl}</p>
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
