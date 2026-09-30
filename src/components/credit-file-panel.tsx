"use client";

import { useState } from "react";

import type { CreditFileView } from "@/lib/credit-file";
import { formatDisplayDate } from "@/lib/format-display-date";

type Props = {
  subjectCompanyId: string;
  partyLabel: string;
  file: CreditFileView;
  canMarkReviewed: boolean;
};

export function CreditFilePanel({ subjectCompanyId, partyLabel, file, canMarkReviewed }: Props) {
  const [reviewedAt, setReviewedAt] = useState(file.reviewedAt);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function markReviewed() {
    setPending(true);
    setMessage(null);
    const res = await fetch(`/api/companies/${subjectCompanyId}/credit-file`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) {
      setMessage(typeof data.error === "string" ? data.error : "Could not save your review.");
      return;
    }
    setReviewedAt(typeof data.data?.reviewedAt === "string" ? data.data.reviewedAt : new Date().toISOString());
  }

  return (
    <section className="mt-6 rounded-lg border border-zinc-200 bg-white p-4 text-sm">
      <h2 className="text-base font-semibold text-zinc-900">Credit file · {partyLabel}</h2>
      <p className="mt-1 text-xs leading-relaxed text-zinc-600">
        {file.subjectName} filed these documents at signup. Open them, then record that you reviewed them.
      </p>
      {!file.authorized ? (
        <p className="mt-3 text-sm text-zinc-600">This company has not filed a credit packet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {file.documents.map((doc) => (
            <li key={doc.id} className="flex flex-wrap items-baseline justify-between gap-2">
              <a
                href={doc.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-lob-navy underline"
              >
                {doc.label}
              </a>
              {doc.expiresAt ? (
                <span className="text-xs text-zinc-500">Expires {formatDisplayDate(new Date(doc.expiresAt))}</span>
              ) : null}
            </li>
          ))}
          {file.documents.length === 0 ? (
            <li className="text-zinc-600">No documents are on this file yet.</li>
          ) : null}
        </ul>
      )}
      {canMarkReviewed && file.authorized && file.documents.length > 0 ? (
        <div className="mt-4">
          {reviewedAt ? (
            <p className="text-xs font-medium text-emerald-800">
              You marked this file reviewed on {formatDisplayDate(new Date(reviewedAt))}.
            </p>
          ) : (
            <button
              type="button"
              className="rounded-lg bg-zinc-900 px-3 py-2 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
              onClick={() => void markReviewed()}
              disabled={pending}
            >
              {pending ? "Saving…" : "I have reviewed this credit file"}
            </button>
          )}
          {message ? <p className="mt-2 text-xs text-rose-700">{message}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
