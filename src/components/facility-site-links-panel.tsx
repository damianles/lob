"use client";

import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

function CopyField({ label, url }: { label: string; url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-zinc-700">{label}</p>
      <div className="flex flex-wrap items-center gap-2">
        <code className="max-w-full truncate rounded bg-white px-2 py-1 text-[11px] text-zinc-800 ring-1 ring-stone-200">
          {url}
        </code>
        <Button type="button" size="sm" variant="secondary" onClick={() => void copy()}>
          {copied ? "Copied" : "Copy link"}
        </Button>
      </div>
    </div>
  );
}

export function FacilitySiteLinksPanel({
  pickupUrl,
  deliveryUrl,
  referenceNumber,
}: {
  pickupUrl: string;
  deliveryUrl: string;
  referenceNumber: string;
}) {
  return (
    <section className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50/60 p-4">
      <h2 className="text-sm font-semibold text-zinc-900">Yard &amp; receiver links</h2>
      <p className="mt-1 text-xs text-zinc-600">
        Share with pickup yards and delivery sites. Shows shipment details only — no rates. Paste into Outlook or print
        the office QR for the gate. Third-party yards need your pickup verification code from the timeline when
        confirming.
      </p>

      <div className="mt-4 space-y-4">
        <CopyField label="Pickup yard link" url={pickupUrl} />
        <CopyField label="Delivery / receiver link" url={deliveryUrl} />
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div className="rounded-lg border border-stone-200 bg-white p-3 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-600">Office QR — pickup</p>
          <p className="mt-1 text-[11px] text-stone-500">{referenceNumber}</p>
          <div className="mx-auto mt-2 flex justify-center">
            <QRCodeSVG value={pickupUrl} size={160} level="H" />
          </div>
          <p className="mt-2 text-[11px] text-stone-500">Post at the scale or gate. Driver paperwork does not include this QR.</p>
        </div>
        <div className="rounded-lg border border-stone-200 bg-white p-3 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-600">Office QR — delivery</p>
          <p className="mt-1 text-[11px] text-stone-500">{referenceNumber}</p>
          <div className="mx-auto mt-2 flex justify-center">
            <QRCodeSVG value={deliveryUrl} size={160} level="M" />
          </div>
          <p className="mt-2 text-[11px] text-stone-500">For the receiving dock or office.</p>
        </div>
      </div>
    </section>
  );
}
