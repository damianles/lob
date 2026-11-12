import { redirect } from "next/navigation";

/** Completion invoice is out of product — LOB does not settle the move. */
export default async function CompletionInvoicePage({ params }: { params: Promise<{ loadId: string }> }) {
  const { loadId } = await params;
  redirect(`/loads/${loadId}`);
}
