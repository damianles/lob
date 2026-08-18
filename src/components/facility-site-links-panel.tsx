"use client";

import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

function CopyField({ label, url }: { label: string; url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  if (!url) return null;

  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-zinc-700">{label}</p>
      <div className="flex flex-wrap items-center gap-2">
        <code className="max-w-full break-all rounded bg-white px-2 py-1 text-[11px] text-zinc-800 ring-1 ring-stone-200">
          {url}
        </code>
        <Button type="button" size="sm" variant="secondary" onClick={() => void copy()}>
          {copied ? "Copied" : "Copy link"}
        </Button>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="text-xs font-medium text-lob-navy underline"
        >
          Open page
        </a>
      </div>
    </div>
  );
}

type Kind = "pickup" | "delivery";

export function FacilitySiteLinksPanel({
  token,
  referenceNumber,
}: {
  token: string;
  referenceNumber: string;
}) {
  const [origin, setOrigin] = useState("");
  const [kind, setKind] = useState<Kind | null>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const pickupUrl = origin ? `${origin}/facility/pickup/${token}` : "";
  const deliveryUrl = origin ? `${origin}/facility/delivery/${token}` : "";
  const activeUrl = kind === "pickup" ? pickupUrl : kind === "delivery" ? deliveryUrl : "";

  return (
    <section className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50/60 p-4">
      <h2 className="text-sm font-semibold text-zinc-900">Confirm Pickup and/or Delivery</h2>
      <p className="mt-1 text-xs text-zinc-600">
        Choose pickup or delivery, then share that link or office QR. Yards do not need a LOB account. No rates on
        these pages.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          aria-expanded={kind === "pickup"}
          onClick={() => setKind((k) => (k === "pickup" ? null : "pickup"))}
          className={`rounded-lg px-3 py-2 text-sm font-semibold ring-1 ${
            kind === "pickup"
              ? "bg-lob-navy text-white ring-lob-navy"
              : "bg-white text-zinc-800 ring-stone-300 hover:bg-stone-50"
          }`}
        >
          Pickup
        </button>
        <button
          type="button"
          aria-expanded={kind === "delivery"}
          onClick={() => setKind((k) => (k === "delivery" ? null : "delivery"))}
          className={`rounded-lg px-3 py-2 text-sm font-semibold ring-1 ${
            kind === "delivery"
              ? "bg-lob-navy text-white ring-lob-navy"
              : "bg-white text-zinc-800 ring-stone-300 hover:bg-stone-50"
          }`}
        >
          Delivery
        </button>
      </div>

      {kind === "pickup" && (
        <div className="mt-4 space-y-3 rounded-lg border border-stone-200 bg-white p-3">
          <p className="text-sm font-semibold text-zinc-900">Pickup confirmation</p>
          <p className="text-xs text-zinc-600">
            For the shipping yard or scale. They confirm when freight is loaded. Load {referenceNumber}.
          </p>
          <CopyField label="Pickup yard link" url={pickupUrl} />
          {activeUrl ? (
            <div className="flex justify-center rounded-lg border border-stone-100 bg-stone-50 p-3">
              <QRCodeSVG value={pickupUrl} size={180} level="M" />
            </div>
          ) : null}
        </div>
      )}

      {kind === "delivery" && (
        <div className="mt-4 space-y-3 rounded-lg border border-stone-200 bg-white p-3">
          <p className="text-sm font-semibold text-zinc-900">Delivery confirmation</p>
          <p className="text-xs text-zinc-600">
            For the receiving dock. They confirm unload / POD. Load {referenceNumber}.
          </p>
          <CopyField label="Delivery / receiver link" url={deliveryUrl} />
          {activeUrl ? (
            <div className="flex justify-center rounded-lg border border-stone-100 bg-stone-50 p-3">
              <QRCodeSVG value={deliveryUrl} size={180} level="M" />
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
