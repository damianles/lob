import Link from "next/link";

import { LobBrandStrip } from "@/components/lob-brand-strip";
import { LobSidebar } from "@/components/lob-sidebar";
import { getActorContext } from "@/lib/request-context";

export const dynamic = "force-dynamic";

export default async function DriverHubPage() {
  const actor = await getActorContext();

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-lob-paper text-stone-900">
      <div className="mx-auto flex max-w-[1600px] gap-0 rounded-lg border border-zinc-200 bg-white shadow-sm">
        <LobSidebar active="driver" />
        <div className="min-w-0 flex-1 p-6 lg:p-8">
          <LobBrandStrip />
          <h1 className="mt-4 text-2xl font-bold text-zinc-900">Driver</h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-600">
            Dispatchers assign a driver to each booked load. Share the driver haul-sheet link, then use Confirm Pickup
            and/or Delivery on the load for yard and receiver QRs. Facilities do not need a LOB account.
          </p>
          <ul className="mt-6 list-inside list-decimal space-y-3 text-sm text-zinc-700">
            <li>
              <strong>Carriers:</strong> open{" "}
              <Link className="font-medium text-lob-navy underline" href="/shipments">
                Shipments
              </Link>
              , choose a load, then create a dispatch from the load detail page. Share the driver haul sheet. Pickup and
              delivery QRs are under Confirm Pickup and/or Delivery on that same load.
            </li>
            <li>
              <strong>Drivers:</strong> open the dispatch link texted or emailed by your dispatcher (path{" "}
              <code className="rounded bg-zinc-100 px-1 text-xs">/driver/…</code>). Yard staff should scan the pickup or
              delivery QR from the load — not this driver page.
            </li>
            <li>
              <strong>Owner-operators:</strong> complete carrier onboarding; admins verify your company. Eligible
              carriers can use{" "}
              <Link className="font-medium text-lob-navy underline" href="/onboarding">
                factoring flags
              </Link>{" "}
              after approval—ask your LOB admin about fast-pay programs.
            </li>
          </ul>
          {!actor.userId && (
            <p className="mt-8 text-sm text-zinc-600">
              <Link href="/sign-in" className="font-medium text-lob-navy underline">
                Sign in
              </Link>{" "}
              as a dispatcher to manage dispatches.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
