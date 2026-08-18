"use client";

import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export function DriverLinkPanel({
  driverUrl,
  bolStripHref,
  driverName,
}: {
  driverUrl: string;
  bolStripHref: string;
  driverName: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(driverUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="mt-6 rounded-lg border border-violet-200 bg-violet-50/70 p-4">
      <h2 className="text-sm font-semibold text-zinc-900">Driver link</h2>
      <p className="mt-1 text-xs text-zinc-600">
        Send to {driverName} for haul details only. Pickup and delivery confirmation stay with yards and receivers — not
        on the driver page or truck paperwork.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <code className="max-w-full truncate rounded bg-white px-2 py-1 text-[11px] text-zinc-800 ring-1 ring-stone-200">
          {driverUrl}
        </code>
        <Button type="button" size="sm" variant="secondary" onClick={() => void copy()}>
          {copied ? "Copied" : "Copy link"}
        </Button>
        <a href={bolStripHref} className="text-xs font-medium text-lob-navy underline">
          Print driver haul sheet
        </a>
      </div>
      <div className="mt-4 inline-block rounded-lg border border-stone-200 bg-white p-2 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">Driver QR (optional)</p>
        <div className="mx-auto mt-1 flex justify-center">
          <QRCodeSVG value={driverUrl} size={120} level="M" />
        </div>
      </div>
    </section>
  );
}
