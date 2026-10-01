"use client";

import { useState } from "react";

import { DocumentUploadField } from "@/components/document-upload-field";

export function InsuranceUploadForm() {
  const [fileUrl, setFileUrl] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [message, setMessage] = useState("");

  async function submit() {
    const iso = expiresAt ? new Date(`${expiresAt}T12:00:00.000Z`).toISOString() : "";
    const res = await fetch("/api/carriers/me/insurance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileUrl,
        expiresAt: iso,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error ? JSON.stringify(data.error) : "Insurance upload failed.");
      return;
    }

    setMessage("Insurance document saved.");
    setFileUrl("");
    setExpiresAt("");
  }

  return (
    <section className="mt-6 rounded-lg border bg-white p-4">
      <h2 className="text-lg font-semibold">Insurance document</h2>
      <p className="mt-1 text-sm text-zinc-600">
        Upload a current certificate of insurance. It should show auto liability and cargo. Add LOB or the mill as
        certificate holder if your broker requires it.
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
        <button className="rounded bg-zinc-900 px-4 py-2 text-sm text-white" type="button" onClick={submit}>
          Save insurance
        </button>
      </div>
      {message && (
        <p className="mt-3 rounded border border-zinc-300 bg-zinc-100 px-3 py-2 text-sm">{message}</p>
      )}
    </section>
  );
}
