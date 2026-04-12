import Link from "next/link";

export default function ScanDeliveryHubPage() {
  return (
    <main className="mx-auto max-w-lg px-4 py-12 text-zinc-900">
      <h1 className="text-2xl font-bold">Facility delivery</h1>
      <p className="mt-3 text-sm text-zinc-600">
        At unload, scan the driver’s <strong>delivery QR</strong> (or open the link they share). You can confirm
        receipt with or without uploading a POD link—no LOB account is required.
      </p>
      <p className="mt-4 text-sm text-zinc-600">
        Link format: <code className="rounded bg-zinc-100 px-1 text-xs">…/facility/delivery/…</code>
      </p>
      <p className="mt-6 text-sm">
        <Link href="/" className="font-medium text-lob-navy underline">
          Back to Loads
        </Link>
      </p>
    </main>
  );
}
