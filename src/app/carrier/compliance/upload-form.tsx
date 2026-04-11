"use client";

import { useState } from "react";

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
      <div className="mt-3 space-y-3">
        <input
          className="w-full rounded border px-3 py-2 text-sm"
          placeholder="Insurance file URL (S3/Drive/etc.)"
          value={fileUrl}
          onChange={(e) => setFileUrl(e.target.value)}
        />
        <input
          className="w-full rounded border px-3 py-2 text-sm"
          type="date"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
        />
        <button
          className="rounded bg-zinc-900 px-4 py-2 text-sm text-white"
          type="button"
          onClick={submit}
        >
          Save insurance
        </button>
      </div>
      {message && (
        <p className="mt-3 rounded border border-zinc-300 bg-zinc-100 px-3 py-2 text-sm">{message}</p>
      )}
    </section>
  );
}

