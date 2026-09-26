import { notFound } from "next/navigation";

import { LegalDocumentView } from "@/components/legal-document-view";
import { LEGAL_BY_SLUG } from "@/lib/legal/documents";

export function generateStaticParams() {
  return Object.keys(LEGAL_BY_SLUG).map((slug) => ({ slug }));
}

export default async function LegalDocumentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = LEGAL_BY_SLUG[slug];
  if (!doc) notFound();
  return (
    <main className="min-h-screen bg-white">
      <LegalDocumentView doc={doc} />
    </main>
  );
}
