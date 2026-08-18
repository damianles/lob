import Link from "next/link";

import { FacilityTokenOpener } from "@/components/facility-token-opener";

export default function ScanPickupHubPage() {
  return (
    <main className="mx-auto max-w-lg px-4 py-12 text-zinc-900">
      <h1 className="text-2xl font-bold">Confirm pickup</h1>
      <p className="mt-3 text-sm text-zinc-600">
        Scan the office QR from the load, or paste the pickup link below. You do not need to sign in. This hub is not
        the confirmation page itself — the QR opens{" "}
        <code className="rounded bg-zinc-100 px-1 text-xs">/facility/pickup/…</code>.
      </p>
      <FacilityTokenOpener kind="pickup" />
      <p className="mt-6 text-sm">
        <Link href="/" className="font-medium text-lob-navy underline">
          Back to Loads
        </Link>
      </p>
    </main>
  );
}
