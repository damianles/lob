"use client";

import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

export function DriverLinkPanel({
  token,
  bolStripHref,
  driverName,
}: {
  token: string;
  bolStripHref: string;
  driverName: string;
}) {
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const driverUrl = origin ? `${origin}/driver/${token}` : "";

  async function copy() {
    if (!driverUrl) return;
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
      <h2 className="text-sm font-semibold text-zinc-900">Driver dispatch</h2>
      <p className="mt-1 text-xs text-zinc-600">
        Send this link to {driverName} for the haul sheet. Print / Save as PDF and attach in Outlook if you are
        emailing it. Pickup and delivery confirmation stay on the yard/receiver links above — not on this driver QR.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {driverUrl ? (
          <code className="max-w-full break-all rounded bg-white px-2 py-1 text-[11px] text-zinc-800 ring-1 ring-stone-200">
            {driverUrl}
          </code>
        ) : null}
        <Button type="button" size="sm" variant="secondary" disabled={!driverUrl} onClick={() => void copy()}>
          {copied ? "Copied" : "Copy link"}
        </Button>
        <a href={bolStripHref} className="text-xs font-medium text-lob-navy underline">
          Open dispatch sheet (print / PDF)
        </a>
      </div>
      {driverUrl ? (
        <div className="mt-4 inline-block rounded-lg border border-stone-200 bg-white p-2 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">Driver haul sheet QR</p>
          <div className="mx-auto mt-1 flex justify-center">
            <QRCodeSVG value={driverUrl} size={120} level="M" />
          </div>
        </div>
      ) : null}
    </section>
  );
}
