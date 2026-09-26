import Link from "next/link";

import type { LegalDocument } from "@/lib/legal/documents";

export function LegalDocumentView({ doc }: { doc: LegalDocument }) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lob-gold-muted">Legal</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-lob-navy">{doc.title}</h1>
      <p className="mt-2 text-sm text-stone-600">
        Version <span className="font-mono text-stone-800">{doc.version}</span> · Effective {doc.effectiveDate}
      </p>
      {doc.isDraft ? (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          <span className="font-semibold">Draft pending counsel review.</span> Operational wording for launch
          readiness — have your attorney finalize before relying on this as binding launch counsel sign-off.
        </p>
      ) : null}
      <p className="mt-4 text-sm leading-relaxed text-stone-700">{doc.summary}</p>

      <div className="mt-8 space-y-8">
        {doc.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="text-lg font-semibold text-zinc-900">{section.heading}</h2>
            <div className="mt-2 space-y-3 text-sm leading-relaxed text-zinc-700">
              {section.paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </section>
        ))}
      </div>

      <p className="mt-10 text-sm text-stone-500">
        <Link href="/legal" className="font-medium text-lob-navy underline">
          All legal documents
        </Link>
      </p>
    </article>
  );
}
