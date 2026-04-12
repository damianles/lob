import Link from "next/link";

export default function ScanPickupHubPage() {
  return (
    <main className="mx-auto max-w-lg px-4 py-12 text-zinc-900">
      <h1 className="text-2xl font-bold">Facility pickup</h1>
      <p className="mt-3 text-sm text-zinc-600">
        When a truck arrives to load, the driver should show a <strong>QR code</strong> or share a short link. Open that
        link on your phone—you will not need to sign in. Enter the pickup verification code from your paperwork to
        confirm the load has left your facility.
      </p>
      <p className="mt-4 text-sm text-zinc-600">
        If you only have the link text, it looks like:{" "}
        <code className="rounded bg-zinc-100 px-1 text-xs">…/facility/pickup/…</code>
      </p>
      <p className="mt-6 text-sm">
        <Link href="/" className="font-medium text-lob-navy underline">
          Back to Loads
        </Link>
      </p>
    </main>
  );
}
