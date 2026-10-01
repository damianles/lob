import Link from "next/link";

import { LobBrandStrip } from "@/components/lob-brand-strip";
import { getMarketplaceIntelSnapshot } from "@/lib/marketplace-intel";
import { getActorContext } from "@/lib/request-context";

export const dynamic = "force-dynamic";

export default async function AdminMarketplaceIntelPage() {
  const actor = await getActorContext();
  if (actor.realRole !== "ADMIN") {
    return (
      <main className="min-h-screen bg-zinc-50 p-6 text-zinc-900">
        <p className="text-sm text-zinc-600">Admin access required.</p>
      </main>
    );
  }

  const intel = await getMarketplaceIntelSnapshot(90);

  return (
    <main className="min-h-screen bg-zinc-50 p-6 text-zinc-900">
      <div className="mx-auto max-w-6xl">
        <LobBrandStrip />
        <h1 className="mt-4 text-3xl font-bold">Marketplace Intel</h1>
        <p className="mt-2 max-w-3xl text-sm text-zinc-600">
          Internal only. Customer Insights UI is deferred. Lane rates keep writing to{" "}
          <code className="rounded bg-zinc-100 px-1">LaneRateObservation</code> on every post/book so we can
          re-enable product analytics later and use this view (or{" "}
          <code className="rounded bg-zinc-100 px-1">npm run report:marketplace-intel</code>) to target
          mills and carriers to onboard.
        </p>
        <p className="mt-2 text-xs text-zinc-500">
          Last {intel.periodDays} days · generated {new Date(intel.generatedAt).toLocaleString()} ·{" "}
          <Link className="underline" href="/admin/companies">
            Companies
          </Link>
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["Loads posted", intel.totals.loadsPosted],
            ["Bookings", intel.totals.bookings],
            ["Active shippers", intel.totals.activeShippers],
            ["Active carriers", intel.totals.activeCarriers],
            ["Rate observations", intel.totals.observationRows],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-lg border bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
            </div>
          ))}
        </div>

        <section className="mt-8">
          <h2 className="text-lg font-semibold">Top city lanes (onboard where volume is)</h2>
          <div className="mt-3 overflow-x-auto rounded-lg border bg-white">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b">
                  <th className="p-3">Lane</th>
                  <th className="p-3">Posts</th>
                  <th className="p-3">Bookings</th>
                </tr>
              </thead>
              <tbody>
                {intel.topCityLanes.map((r) => (
                  <tr key={r.lane} className="border-b">
                    <td className="p-3">{r.lane}</td>
                    <td className="p-3 tabular-nums">{r.posts}</td>
                    <td className="p-3 tabular-nums">{r.bookings}</td>
                  </tr>
                ))}
                {intel.topCityLanes.length === 0 ? (
                  <tr>
                    <td className="p-4 text-zinc-500" colSpan={3}>
                      No lane activity in this window yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div>
            <h2 className="text-lg font-semibold">Shippers to deepen (by posts)</h2>
            <div className="mt-3 overflow-x-auto rounded-lg border bg-white">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="p-3">Company</th>
                    <th className="p-3">Posts</th>
                    <th className="p-3">Phone</th>
                  </tr>
                </thead>
                <tbody>
                  {intel.topShippersByPosts.map((r) => (
                    <tr key={r.companyId} className="border-b">
                      <td className="p-3 font-medium">{r.legalName}</td>
                      <td className="p-3 tabular-nums">{r.posts}</td>
                      <td className="p-3 text-xs text-zinc-600">{r.phone ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <h2 className="text-lg font-semibold">Carriers to deepen (by bookings)</h2>
            <div className="mt-3 overflow-x-auto rounded-lg border bg-white">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="p-3">Company</th>
                    <th className="p-3">Bookings</th>
                    <th className="p-3">Phone</th>
                  </tr>
                </thead>
                <tbody>
                  {intel.topCarriersByBooks.map((r) => (
                    <tr key={r.companyId} className="border-b">
                      <td className="p-3 font-medium">{r.legalName}</td>
                      <td className="p-3 tabular-nums">{r.bookings}</td>
                      <td className="p-3 text-xs text-zinc-600">{r.phone ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-semibold">Thin lanes (need more samples before product Insights)</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Same data as <code className="rounded bg-zinc-100 px-1">npm run report-thin-lanes</code>.
          </p>
          <div className="mt-3 overflow-x-auto rounded-lg border bg-white">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b">
                  <th className="p-3">Lane</th>
                  <th className="p-3">Samples</th>
                </tr>
              </thead>
              <tbody>
                {intel.thinLanes.slice(0, 40).map((r) => (
                  <tr key={`${r.lane}-${r.equipmentType}-${r.sampleCount}`} className="border-b">
                    <td className="p-3">
                      {r.lane} · {r.equipmentType}
                    </td>
                    <td className="p-3 tabular-nums">{r.sampleCount}</td>
                  </tr>
                ))}
                {intel.thinLanes.length === 0 ? (
                  <tr>
                    <td className="p-4 text-zinc-500" colSpan={2}>
                      No thin lanes flagged.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
