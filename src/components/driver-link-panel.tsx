"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";

function digitsOnly(phone: string) {
  return phone.replace(/[^\d+]/g, "");
}

export function DriverLinkPanel({
  token,
  bolStripHref,
  driverName,
  driverPhone: initialPhone,
  driverEmail: initialEmail,
  loadReference,
  laneLabel,
}: {
  token: string;
  bolStripHref: string;
  driverName: string;
  driverPhone?: string | null;
  driverEmail?: string | null;
  loadReference: string;
  laneLabel: string;
}) {
  const [origin, setOrigin] = useState("");
  const [phone, setPhone] = useState(initialPhone ?? "");
  const [email, setEmail] = useState(initialEmail ?? "");
  const [copied, setCopied] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const haulUrl = origin ? `${origin}/driver/${token}` : "";
  const printUrl = origin ? `${origin}${bolStripHref}` : bolStripHref;

  const messageBody = useMemo(() => {
    const lines = [
      `LOB haul sheet for ${driverName}`,
      `Load ${loadReference}`,
      laneLabel,
      "",
      "Open haul sheet (print / PDF):",
      printUrl,
      "",
      "Driver view link:",
      haulUrl,
      "",
      "Pickup and delivery are confirmed by the carrier coordinator on the load — not by QR.",
    ];
    return lines.join("\n");
  }, [driverName, haulUrl, laneLabel, loadReference, printUrl]);

  const mailtoHref =
    email.trim() && haulUrl
      ? `mailto:${email.trim()}?subject=${encodeURIComponent(
          `Haul sheet — ${loadReference}`,
        )}&body=${encodeURIComponent(messageBody)}`
      : null;

  const smsHref =
    phone.trim() && haulUrl
      ? `sms:${digitsOnly(phone.trim())}?body=${encodeURIComponent(messageBody)}`
      : null;

  async function copyLink() {
    if (!haulUrl) return;
    try {
      await navigator.clipboard.writeText(haulUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  async function saveDriverContact() {
    setSaveMsg(null);
    const res = await fetch("/api/carriers/me/drivers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: driverName,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
      }),
    });
    if (!res.ok) {
      setSaveMsg("Could not save driver contact.");
      return;
    }
    setSaveMsg("Driver saved for next load.");
  }

  return (
    <section className="mt-6 rounded-lg border border-sky-200 bg-sky-50/70 p-4">
      <h2 className="text-sm font-semibold text-zinc-900">Send haul sheet to driver</h2>
      <p className="mt-1 text-xs text-zinc-600">
        Email or text {driverName} the haul sheet from your device (opens Outlook / Messages). No QR codes. Pickup
        and delivery stay on this load for the coordinator.
      </p>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <label className="block text-xs text-zinc-600">
          Driver email
          <input
            type="email"
            className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-zinc-900"
            placeholder="driver@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="block text-xs text-zinc-600">
          Driver phone (for text)
          <input
            type="tel"
            className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-zinc-900"
            placeholder="+1…"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {mailtoHref ? (
          <a
            href={mailtoHref}
            className="inline-flex h-9 items-center rounded-lg bg-lob-navy px-3 text-sm font-medium text-white hover:bg-lob-navy/90"
            onClick={() => void saveDriverContact()}
          >
            Email haul sheet
          </a>
        ) : (
          <Button type="button" size="sm" disabled>
            Email haul sheet
          </Button>
        )}
        {smsHref ? (
          <a
            href={smsHref}
            className="inline-flex h-9 items-center rounded-lg border border-stone-300 bg-white px-3 text-sm font-medium text-zinc-900 hover:bg-stone-50"
            onClick={() => void saveDriverContact()}
          >
            Text haul sheet
          </a>
        ) : (
          <Button type="button" size="sm" variant="secondary" disabled>
            Text haul sheet
          </Button>
        )}
        <a href={bolStripHref} className="text-xs font-medium text-lob-navy underline">
          Open haul sheet (print / PDF)
        </a>
        <Button type="button" size="sm" variant="secondary" disabled={!haulUrl} onClick={() => void copyLink()}>
          {copied ? "Copied" : "Copy link"}
        </Button>
      </div>
      {!email.trim() && !phone.trim() ? (
        <p className="mt-2 text-xs text-amber-800">Add an email and/or phone to enable send.</p>
      ) : null}
      {saveMsg ? <p className="mt-2 text-xs text-zinc-600">{saveMsg}</p> : null}
    </section>
  );
}
