import Link from "next/link";

import { FacilityTokenOpener } from "@/components/facility-token-opener";

export default function ScanDeliveryHubPage() {
  return (
    <main className="mx-auto max-w-lg px-4 py-12 text-zinc-900">
      <h1 className="text-2xl font-bold">Confirm delivery</h1>
      <p className="mt-3 text-sm text-zinc-600">
        Scan the office QR from the load, or paste the delivery link below. You do not need to sign in. The QR opens{" "}
        <code className="rounded bg-zinc-100 px-1 text-xs">/facility/delivery/…</code>.
      </p>
      <FacilityTokenOpener kind="delivery" />
      <p className="mt-6 text-sm">
        <Link href="/" className="font-medium text-lob-navy underline">
          Back to Loads
        </Link>
      </p>
    </main>
  );
}
