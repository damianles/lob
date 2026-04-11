import Link from "next/link";

import { LobSidebar } from "@/components/lob-sidebar";

export const dynamic = "force-dynamic";

export default function CapacityPage() {
  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-lob-paper text-stone-900">
      <div className="mx-auto flex max-w-[1600px] gap-0 rounded-lg border border-zinc-200 bg-white shadow-sm">
        <LobSidebar active="tools" />
        <div className="min-w-0 flex-1 p-6 lg:p-8">
          <h1 className="text-2xl font-bold text-zinc-900">Truck capacity (lane board)</h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-600">
            Carriers post available capacity by lane; suppliers search without seeing carrier names. A full anonymous
            match flow with counter-offers and integrated holds is on the roadmap.
          </p>

          <section className="mt-6 rounded-lg border border-lob-gold/40 bg-lob-paper p-4 text-sm text-lob-navy">
            <h2 className="font-semibold">Planned transaction fee (transparency)</h2>
            <p className="mt-2 text-zinc-800">
              When we launch matched booking between a posted truck and a supplier load, the intent is{" "}
              <strong>$35 USD from each party</strong> ($70 total per match): authorization/hold at booking, capture
              after delivery confirmation. No charges are taken in this preview until payments are wired.
            </p>
          </section>

          <section className="mt-8 grid gap-6 lg:grid-cols-2">
            <div className="rounded-lg border border-zinc-200 p-4">
              <h3 className="font-semibold text-zinc-900">Suppliers — search capacity</h3>
              <p className="mt-2 text-sm text-zinc-600">
                Signed-in supplier accounts can call{" "}
                <code className="rounded bg-zinc-100 px-1">GET /api/capacity?originZip=&amp;destinationZip=</code> — a
                UI table will be added next to this page.
              </p>
            </div>
            <div className="rounded-lg border border-zinc-200 p-4">
              <h3 className="font-semibold text-zinc-900">Carriers — post capacity</h3>
              <p className="mt-2 text-sm text-zinc-600">
                Use <code className="rounded bg-zinc-100 px-1">POST /api/capacity</code> with origin/destination ZIP,
                equipment, and asking rate. Your company name is not exposed in supplier search results.
              </p>
            </div>
          </section>

          <p className="mt-8 text-sm text-zinc-600">
            <Link href="/tools" className="font-medium text-lob-navy underline">
              ← Back to Help & tools
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
