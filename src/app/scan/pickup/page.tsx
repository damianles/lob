import Link from "next/link";

export default function ScanPickupHubPage() {
  return (
    <main className="mx-auto max-w-lg px-4 py-12 text-zinc-900">
      <h1 className="text-2xl font-bold">Facility pickup</h1>
      <p className="mt-3 text-sm text-zinc-600">
        When a truck arrives, open the <strong>pickup link</strong> or scan the <strong>office QR</strong> from the
        shipper. You do not need to sign in. Enter the verification code if the shipper provided one.
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
