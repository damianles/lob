"use client";

import { useEffect, useState } from "react";

import { DocumentUploadField } from "@/components/document-upload-field";
import type { CreditFileView } from "@/lib/credit-file";

export function CreditFileForm({ showInsurance }: { showInsurance: boolean }) {
  const [w9Url, setW9Url] = useState("");
  const [businessRegistrationUrl, setBusinessRegistrationUrl] = useState("");
  const [creditReferenceUrl, setCreditReferenceUrl] = useState("");
  const [insuranceUrl, setInsuranceUrl] = useState("");
  const [insuranceExpiresAt, setInsuranceExpiresAt] = useState("");
  const [file, setFile] = useState<CreditFileView | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    void fetch("/api/companies/me/credit-file")
      .then((r) => (r.ok ? r.json() : null))
      .then((body: { data?: CreditFileView } | null) => {
        if (body?.data) setFile(body.data);
      })
      .catch(() => undefined);
  }, []);

  async function save() {
    setPending(true);
    setMessage(null);
    const res = await fetch("/api/companies/me/credit-file", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        w9Url: w9Url.trim() || undefined,
        businessRegistrationUrl: businessRegistrationUrl.trim() || undefined,
        creditReferenceUrl: creditReferenceUrl.trim(),
        ...(showInsurance
          ? {
              insuranceUrl: insuranceUrl.trim(),
              insuranceExpiresAt: insuranceExpiresAt
                ? new Date(`${insuranceExpiresAt}T12:00:00.000Z`).toISOString()
                : undefined,
            }
          : {}),
      }),
    });
    const data = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) {
      setMessage(typeof data.error === "string" ? data.error : "Could not save the credit file.");
      return;
    }
    setFile(data.data ?? null);
    setMessage("Credit file saved. After a booking, the other company may view these documents.");
  }

  return (
    <section className="mt-6 rounded-lg border bg-white p-4">
      <h2 className="text-lg font-semibold">Credit file</h2>
      <p className="mt-1 text-sm text-zinc-600">
        Prefer PDF/image upload. Credit reference may use a factoring-portal link.
        {showInsurance ? " Carriers also file insurance with an expiry date." : ""}
      </p>
      {file?.documents.length ? (
        <ul className="mt-3 space-y-1 text-sm">
          {file.documents.map((doc) => (
            <li key={doc.id}>
              <a
                href={doc.fileUrl}
                className="font-medium text-lob-navy underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                {doc.label}
                {doc.expiresAt ? ` (exp ${doc.expiresAt.slice(0, 10)})` : ""}
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-zinc-500">Nothing filed yet.</p>
      )}
      <div className="mt-3 space-y-3">
        <DocumentUploadField label="W-9" kind="W9" value={w9Url} onChange={setW9Url} />
        <DocumentUploadField
          label="Business registration / tax form (CA)"
          kind="BUSINESS_REGISTRATION"
          value={businessRegistrationUrl}
          onChange={setBusinessRegistrationUrl}
          helpText="Canadian BN registration, GST/HST, or provincial business registration."
        />
        <DocumentUploadField
          label="Credit reference"
          kind="CREDIT_REFERENCE"
          value={creditReferenceUrl}
          onChange={setCreditReferenceUrl}
          acceptExternalLink
          helpText="Trade reference letter, factoring approval page, or bank/credit application PDF."
        />
        {showInsurance ? (
          <>
            <DocumentUploadField
              label="Certificate of insurance"
              kind="INSURANCE"
              value={insuranceUrl}
              onChange={setInsuranceUrl}
              helpText="Should show auto liability and cargo. Add certificate holder if your broker requires it."
            />
            <label className="block text-xs font-medium text-zinc-600">
              Insurance expiry
              <input
                className="mt-1 w-full rounded border px-3 py-2 text-sm font-normal"
                type="date"
                value={insuranceExpiresAt}
                onChange={(e) => setInsuranceExpiresAt(e.target.value)}
              />
            </label>
          </>
        ) : null}
        <button
          className="rounded bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-60"
          type="button"
          disabled={pending}
          onClick={() => void save()}
        >
          {pending ? "Saving…" : "Save credit file"}
        </button>
      </div>
      {message ? <p className="mt-3 text-sm text-zinc-700">{message}</p> : null}
    </section>
  );
}
