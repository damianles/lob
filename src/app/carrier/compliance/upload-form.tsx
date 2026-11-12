"use client";

import { useState } from "react";

import { DocumentUploadField } from "@/components/document-upload-field";

function parseUsd(raw: string): number | null {
  const n = Number(raw.replace(/[,$]/g, "").trim());
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

export function InsuranceUploadForm() {
  const [fileUrl, setFileUrl] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [cargoCoverageUsd, setCargoCoverageUsd] = useState("");
  const [autoLiabilityCoverageUsd, setAutoLiabilityCoverageUsd] = useState("");
  const [message, setMessage] = useState("");

  async function submit() {
    const cargo = parseUsd(cargoCoverageUsd);
    const auto = parseUsd(autoLiabilityCoverageUsd);
    if (!cargo || !auto) {
      setMessage("Enter cargo and auto liability coverage amounts in USD.");
      return;
    }
    const iso = expiresAt ? new Date(`${expiresAt}T12:00:00.000Z`).toISOString() : "";
    const res = await fetch("/api/carriers/me/insurance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileUrl,
        expiresAt: iso,
        cargoCoverageUsd: cargo,
        autoLiabilityCoverageUsd: auto,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error ? JSON.stringify(data.error) : "Insurance upload failed.");
      return;
    }

    setMessage("Insurance document saved. Coverages are visible to mills after booking.");
    setFileUrl("");
    setExpiresAt("");
    setCargoCoverageUsd("");
    setAutoLiabilityCoverageUsd("");
  }

  return (
    <section className="mt-6 rounded-lg border bg-white p-4">
      <h2 className="text-lg font-semibold">Insurance document</h2>
      <p className="mt-1 text-sm text-zinc-600">
        Upload a current certificate of insurance and enter the cargo and auto liability limits from the COI. Mills see
        those limits on your scorecard after a booking. Add LOB or the mill as certificate holder if your broker
        requires it.
      </p>
      <div className="mt-3 space-y-3">
        <DocumentUploadField
          label="Certificate of insurance"
          kind="INSURANCE"
          value={fileUrl}
          onChange={setFileUrl}
          required
        />
        <label className="block text-xs font-medium text-zinc-600">
          Insurance expiry
          <input
            className="mt-1 w-full rounded border px-3 py-2 text-sm font-normal"
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-medium text-zinc-600">
            Cargo coverage (USD)
            <input
              className="mt-1 w-full rounded border px-3 py-2 text-sm font-normal"
              inputMode="numeric"
              placeholder="100000"
              value={cargoCoverageUsd}
              onChange={(e) => setCargoCoverageUsd(e.target.value)}
            />
          </label>
          <label className="block text-xs font-medium text-zinc-600">
            Auto liability (USD)
            <input
              className="mt-1 w-full rounded border px-3 py-2 text-sm font-normal"
              inputMode="numeric"
              placeholder="1000000"
              value={autoLiabilityCoverageUsd}
              onChange={(e) => setAutoLiabilityCoverageUsd(e.target.value)}
            />
          </label>
        </div>
        <button className="rounded bg-zinc-900 px-4 py-2 text-sm text-white" type="button" onClick={() => void submit()}>
          Save insurance
        </button>
      </div>
      {message && (
        <p className="mt-3 rounded border border-zinc-300 bg-zinc-100 px-3 py-2 text-sm">{message}</p>
      )}
    </section>
  );
}
