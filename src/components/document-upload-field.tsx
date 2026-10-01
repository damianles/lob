"use client";

import { useState } from "react";

/**
 * Prefer file upload to Blob; always allow paste-https as fallback / external portal link.
 */
export function DocumentUploadField({
  label,
  kind,
  value,
  onChange,
  required,
  acceptExternalLink,
  helpText,
}: {
  label: string;
  kind: string;
  value: string;
  onChange: (url: string) => void;
  required?: boolean;
  /** Prefer for credit portals; also used as general fallback link. */
  acceptExternalLink?: boolean;
  helpText?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onFile(file: File | null) {
    if (!file) return;
    setBusy(true);
    setErr(null);
    const body = new FormData();
    body.set("file", file);
    body.set("kind", kind);
    const res = await fetch("/api/uploads/document", { method: "POST", body });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setErr(typeof data.error === "string" ? data.error : "Upload failed.");
      return;
    }
    if (typeof data.data?.url === "string") onChange(data.data.url);
  }

  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-zinc-600">
        {label}
        {required ? " *" : ""}
      </label>
      {helpText ? <p className="text-[11px] leading-relaxed text-zinc-500">{helpText}</p> : null}
      <input
        type="file"
        accept="application/pdf,image/jpeg,image/png,image/webp"
        className="block w-full text-sm text-zinc-700 file:mr-3 file:rounded file:border-0 file:bg-stone-100 file:px-3 file:py-1.5 file:text-sm file:font-medium"
        disabled={busy}
        onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
      />
      <input
        className="w-full rounded border bg-white px-3 py-2 text-sm"
        type="url"
        inputMode="url"
        placeholder={
          acceptExternalLink
            ? "Or paste https:// link (factoring portal / hosted file)"
            : "Or paste https:// link if upload is unavailable"
        }
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required && !value}
      />
      {value ? (
        <p className="truncate text-xs text-zinc-500">
          Filed:{" "}
          <a href={value} className="text-lob-navy underline" target="_blank" rel="noopener noreferrer">
            open file
          </a>
        </p>
      ) : null}
      {busy ? <p className="text-xs text-zinc-500">Uploading…</p> : null}
      {err ? <p className="text-xs text-rose-700">{err}</p> : null}
    </div>
  );
}
