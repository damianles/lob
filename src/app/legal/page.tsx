import Link from "next/link";

import { LEGAL_DOCUMENTS } from "@/lib/legal/documents";

export default function LegalIndexPage() {
  const docs = Object.values(LEGAL_DOCUMENTS);
  return (
    <main className="min-h-screen bg-stone-50/60">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lob-gold-muted">Legal</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-lob-navy">Platform documents</h1>
        <p className="mt-3 text-sm text-stone-600">
          Versioned agreements used at supplier and carrier onboarding. Drafts are pending counsel review before
          launch.
        </p>
        <ul className="mt-8 divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white">
          {docs.map((doc) => (
            <li key={doc.key}>
              <Link href={`/legal/${doc.slug}`} className="block px-4 py-4 hover:bg-stone-50">
                <p className="font-semibold text-zinc-900">{doc.title}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  v{doc.version} · {doc.effectiveDate}
                  {doc.isDraft ? " · draft" : ""}
                </p>
                <p className="mt-1 text-sm text-zinc-600">{doc.summary}</p>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-sm">
          <Link href="/" className="font-medium text-lob-navy underline">
            Back to LOB
          </Link>
        </p>
      </div>
    </main>
  );
}
