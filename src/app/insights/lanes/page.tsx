import Link from "next/link";

import { getAnalyticsOverview, getLaneQuickOptions, type AnalyticsPeriod } from "@/lib/analytics";
import { prisma } from "@/lib/prisma";
import { getActorContext } from "@/lib/request-context";

export const dynamic = "force-dynamic";

const periods: { value: AnalyticsPeriod; label: string }[] = [
  { value: "week", label: "Week by week (7d)" },
  { value: "30d", label: "30 days" },
  { value: "60d", label: "60 days" },
  { value: "90d", label: "90 days" },
  { value: "yoy", label: "Year over year (365d)" },
];

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function formatPct(value: number | null) {
  if (value === null) return "N/A";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function toPeriod(value: string | undefined): AnalyticsPeriod {
  if (!value) return "30d";
  if (value === "week" || value === "30d" || value === "60d" || value === "90d" || value === "yoy") return value;
  return "30d";
}

export default async function LaneAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const actor = await getActorContext();
  if (!actor.userId) {
    return (
      <div className="max-w-3xl">
        <h1 className="text-2xl font-bold">Lane rate analytics</h1>
        <p className="mt-2 text-sm text-zinc-600">Please sign in to access insights.</p>
      </div>
    );
  }
  if (!actor.companyId && actor.role !== "ADMIN") {
    return (
      <div className="max-w-3xl">
        <h1 className="text-2xl font-bold">Lane rate analytics</h1>
        <p className="mt-2 text-sm text-zinc-600">Complete onboarding to link your account with a company first.</p>
        <Link className="mt-4 inline-block text-blue-700 underline" href="/onboarding">
          Go to onboarding
        </Link>
      </div>
    );
  }

  let isSubscriber = actor.role === "ADMIN";
  if (!isSubscriber && actor.companyId) {
    const company = await prisma.company.findUnique({
      where: { id: actor.companyId },
      select: { analyticsSubscriber: true },
    });
    isSubscriber = Boolean(company?.analyticsSubscriber);
  }

  if (!isSubscriber) {
    return (
      <div className="max-w-3xl">
        <h1 className="text-2xl font-bold">Lane rate analytics (subscriber)</h1>
        <p className="mt-2 text-sm text-zinc-600">
          This module is available for paid subscribers. Ask an admin to enable analytics for your company.
        </p>
      </div>
    );
  }

  const period = toPeriod(Array.isArray(params.period) ? params.period[0] : params.period);
  const originCity = (Array.isArray(params.originCity) ? params.originCity[0] : params.originCity) ?? "";
  const originState = (Array.isArray(params.originState) ? params.originState[0] : params.originState) ?? "";
  const destinationCity = (Array.isArray(params.destinationCity) ? params.destinationCity[0] : params.destinationCity) ?? "";
  const destinationState = (Array.isArray(params.destinationState) ? params.destinationState[0] : params.destinationState) ?? "";
  const quickLane = (Array.isArray(params.quickLane) ? params.quickLane[0] : params.quickLane) ?? "";

  const [overview, laneOptions] = await Promise.all([
    getAnalyticsOverview(
      { role: actor.role, companyId: actor.companyId },
      { period, originCity, originState, destinationCity, destinationState, quickLane },
    ),
    getLaneQuickOptions(80),
  ]);

  return (
    <div className="mx-auto max-w-6xl text-zinc-900">
        <h1 className="text-2xl font-bold sm:text-3xl">Lane rates &amp; trends</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Pricing, volume, how often loads book, equipment mix, and lane snapshots—using your data and benchmark file.
        </p>

        <form method="get" action="/insights/lanes" className="mt-5 rounded-lg border bg-white p-4">
          <p className="mb-3 text-xs text-zinc-500">
            The <strong>period</strong> dropdown shapes the summary cards and charts below. The green{" "}
            <strong>booked lanes</strong> table always compares the last 30, 60, and 90 days from today (live bookings
            only).
          </p>
          <div className="grid gap-3 md:grid-cols-3">
            <select name="period" defaultValue={period} className="rounded border px-3 py-2 text-sm">
              {periods.map((p) => (
                <option value={p.value} key={p.value}>
                  {p.label}
                </option>
              ))}
            </select>

            <input
              list="lane-options"
              name="quickLane"
              defaultValue={quickLane}
              className="rounded border px-3 py-2 text-sm md:col-span-2"
              placeholder="Quick type lane: Seattle, WA -> Boise, ID"
            />
            <datalist id="lane-options">
              {laneOptions.map((lane) => (
                <option value={lane} key={lane} />
              ))}
            </datalist>

            <input name="originCity" defaultValue={originCity} className="rounded border px-3 py-2 text-sm" placeholder="Origin city" />
            <input name="originState" defaultValue={originState} className="rounded border px-3 py-2 text-sm" placeholder="Origin state (WA)" />
            <input
              name="destinationCity"
              defaultValue={destinationCity}
              className="rounded border px-3 py-2 text-sm"
              placeholder="Destination city"
            />
            <input
              name="destinationState"
              defaultValue={destinationState}
              className="rounded border px-3 py-2 text-sm"
              placeholder="Destination state (ID)"
            />
          </div>
          <button type="submit" className="mt-3 rounded-md bg-lob-navy px-4 py-2 text-sm font-semibold text-white hover:bg-lob-navy-hover">
            Update report
          </button>
        </form>

        <section className="mt-6 grid gap-4 md:grid-cols-4">
          <article className="rounded-lg border bg-white p-4">
            <p className="text-xs text-zinc-500">Average rate</p>
            <p className="text-2xl font-semibold">{formatMoney(overview.pricing.averageRateUsd)}</p>
            <p className="text-xs text-zinc-500">YoY: {formatPct(overview.pricing.yoyRateChangePct)}</p>
          </article>
          <article className="rounded-lg border bg-white p-4">
            <p className="text-xs text-zinc-500">Loads posted</p>
            <p className="text-2xl font-semibold">{overview.volume.loadsPosted}</p>
            <p className="text-xs text-zinc-500">Delivered: {overview.volume.loadsDelivered}</p>
          </article>
          <article className="rounded-lg border bg-white p-4">
            <p className="text-xs text-zinc-500">Bookings</p>
            <p className="text-2xl font-semibold">{overview.volume.bookings}</p>
            <p className="text-xs text-zinc-500">Per week: {overview.frequency.bookingsPerWeek.toFixed(1)}</p>
          </article>
          <article className="rounded-lg border bg-white p-4">
            <p className="text-xs text-zinc-500">Total volume (lbs)</p>
            <p className="text-2xl font-semibold">{overview.volume.totalWeightLbs.toLocaleString()}</p>
            <p className="text-xs text-zinc-500">Booking YoY: {formatPct(overview.frequency.yoyBookingChangePct)}</p>
          </article>
        </section>

        <section className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50/50 p-4">
          <h2 className="text-lg font-semibold text-emerald-950">Booked lanes — live 30 / 60 / 90 day averages</h2>
          <p className="mt-2 max-w-3xl text-sm text-emerald-900/90">
            These numbers come only from loads <strong>booked on LOB</strong> (agreed rate at booking). Each column
            counts bookings whose <strong>booked date</strong> falls in the last 30, 60, or 90 days—three separate
            windows, not nested. Mills see lanes for their freight; carriers see lanes they booked. Use the filters above
            to focus a lane or state pair. A contact directory spreadsheet is useful for outreach, but it does not
            replace lane pricing; as volume grows, this table is your ground truth.
          </p>
          <div className="mt-4 overflow-x-auto rounded border border-emerald-100 bg-white">
            <table className="w-full min-w-[920px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase text-zinc-600">
                  <th className="px-3 py-2">Lane</th>
                  <th className="px-3 py-2">Equipment</th>
                  <th className="px-3 py-2 text-right">30d #</th>
                  <th className="px-3 py-2 text-right">30d avg</th>
                  <th className="px-3 py-2 text-right">60d #</th>
                  <th className="px-3 py-2 text-right">60d avg</th>
                  <th className="px-3 py-2 text-right">90d #</th>
                  <th className="px-3 py-2 text-right">90d avg</th>
                </tr>
              </thead>
              <tbody>
                {overview.bookedLaneExplorer.map((row) => (
                  <tr key={`${row.lane}-${row.equipmentType}`} className="border-b border-zinc-100">
                    <td className="max-w-[280px] px-3 py-2 text-zinc-800">{row.lane}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-zinc-600">{row.equipmentType}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{row.last30Days.bookingCount}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-medium">
                      {row.last30Days.averageAgreedRateUsd != null
                        ? formatMoney(row.last30Days.averageAgreedRateUsd)
                        : "—"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{row.last60Days.bookingCount}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-medium">
                      {row.last60Days.averageAgreedRateUsd != null
                        ? formatMoney(row.last60Days.averageAgreedRateUsd)
                        : "—"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{row.last90Days.bookingCount}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-medium">
                      {row.last90Days.averageAgreedRateUsd != null
                        ? formatMoney(row.last90Days.averageAgreedRateUsd)
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {overview.bookedLaneExplorer.length === 0 && (
              <p className="p-6 text-center text-sm text-zinc-500">
                No bookings in the last 90 days for this scope. Book a few loads on the board, then refresh—benchmarks
                below still work from your file until then.
              </p>
            )}
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          <article className="rounded-lg border bg-white p-4">
            <h2 className="text-lg font-semibold">Equipment / truck style mix</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {overview.equipmentMix.map((item) => (
                <li key={item.equipmentType} className="flex justify-between">
                  <span>{item.equipmentType}</span>
                  <span>
                    {item.count} ({item.sharePct.toFixed(1)}%)
                  </span>
                </li>
              ))}
              {overview.equipmentMix.length === 0 && <li className="text-zinc-500">No booking data for selected filters.</li>}
            </ul>
          </article>

          <article className="rounded-lg border bg-white p-4">
            <h2 className="text-lg font-semibold">Booking frequency trends</h2>
            <ul className="mt-3 max-h-56 space-y-2 overflow-auto text-sm">
              {overview.trends.map((t) => (
                <li key={t.bucket} className="flex justify-between">
                  <span>{t.bucket}</span>
                  <span>
                    {t.bookings} bookings | {formatMoney(t.averageRate)}
                  </span>
                </li>
              ))}
              {overview.trends.length === 0 && <li className="text-zinc-500">No trend points in selected period.</li>}
            </ul>
          </article>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          <article className="rounded-lg border bg-white p-4">
            <h2 className="text-lg font-semibold">Lanes by state pair</h2>
            <p className="mt-1 text-xs text-zinc-500">Origin state → destination state (loads posted vs bookings).</p>
            <ul className="mt-3 max-h-64 space-y-2 overflow-auto text-sm">
              {overview.lanes.byStatePair.map((row) => (
                <li key={row.statePair} className="flex justify-between gap-2 border-b border-zinc-100 pb-1">
                  <span className="font-medium">{row.statePair}</span>
                  <span className="text-zinc-600">
                    {row.loadsPosted} loads · {row.bookings} booked
                  </span>
                </li>
              ))}
              {overview.lanes.byStatePair.length === 0 && (
                <li className="text-zinc-500">No lane data for this period.</li>
              )}
            </ul>
          </article>
          <article className="rounded-lg border bg-white p-4">
            <h2 className="text-lg font-semibold">Lanes by city (detail)</h2>
            <p className="mt-1 text-xs text-zinc-500">Finer OD pairs matching spreadsheet-style lanes.</p>
            <ul className="mt-3 max-h-64 space-y-2 overflow-auto text-sm">
              {overview.lanes.byCityPair.map((row) => (
                <li key={row.lane} className="flex flex-col gap-1 border-b border-zinc-100 pb-2">
                  <span>{row.lane}</span>
                  <span className="text-xs text-zinc-600">
                    {row.loadsPosted} loads · {row.bookings} booked
                  </span>
                </li>
              ))}
              {overview.lanes.byCityPair.length === 0 && (
                <li className="text-zinc-500">No city-lane data for this period.</li>
              )}
            </ul>
          </article>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          <article className="rounded-lg border bg-white p-4">
            <h2 className="text-lg font-semibold">Equipment — posted loads</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {overview.equipmentPostedMix.map((item) => (
                <li key={item.equipmentType} className="flex justify-between">
                  <span>{item.equipmentType}</span>
                  <span>
                    {item.count} ({item.sharePct.toFixed(1)}%)
                  </span>
                </li>
              ))}
              {overview.equipmentPostedMix.length === 0 && (
                <li className="text-zinc-500">No loads in period.</li>
              )}
            </ul>
          </article>
          <article className="rounded-lg border bg-white p-4">
            <h2 className="text-lg font-semibold">Spreadsheet benchmarks vs your bookings</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Rows come from <code className="rounded bg-zinc-100 px-1">data/market-benchmarks.json</code> — replace
              with your export (origin ST, dest ST, equipment, benchmark USD).
            </p>
            <ul className="mt-3 max-h-64 space-y-3 overflow-auto text-sm">
              {overview.spreadsheetBenchmarks.map((row) => (
                <li key={`${row.originState}-${row.destinationState}-${row.equipmentType}`} className="border-b border-zinc-100 pb-2">
                  <div className="font-medium">
                    {row.originState} → {row.destinationState} · {row.equipmentType}
                  </div>
                  <div className="mt-1 text-xs text-zinc-600">
                    Benchmark {formatMoney(row.benchmarkAvgUsd)}
                    {row.yourBookedAvgUsd != null && (
                      <>
                        {" "}
                        · Your avg booked {formatMoney(row.yourBookedAvgUsd)} ({row.bookingCount} loads)
                        {row.deltaVsBenchmarkPct != null && (
                          <span> · {formatPct(row.deltaVsBenchmarkPct)} vs benchmark</span>
                        )}
                      </>
                    )}
                    {row.yourBookedAvgUsd == null && <span> · No matching bookings in period</span>}
                  </div>
                </li>
              ))}
            </ul>
          </article>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          <article className="rounded-lg border bg-white p-4">
            <h2 className="text-lg font-semibold">Preferred origins (mill / seller)</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {overview.shipperPreferences.preferredOrigins.map((item) => (
                <li key={item.lane} className="flex justify-between">
                  <span>{item.lane}</span>
                  <span>{item.count} loads</span>
                </li>
              ))}
              {overview.shipperPreferences.preferredOrigins.length === 0 && (
                <li className="text-zinc-500">No origin history for selected filters.</li>
              )}
            </ul>
          </article>
          <article className="rounded-lg border bg-white p-4">
            <h2 className="text-lg font-semibold">Preferred destinations (mill / seller)</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {overview.shipperPreferences.preferredDestinations.map((item) => (
                <li key={item.lane} className="flex justify-between">
                  <span>{item.lane}</span>
                  <span>{item.count} loads</span>
                </li>
              ))}
              {overview.shipperPreferences.preferredDestinations.length === 0 && (
                <li className="text-zinc-500">No destination history for selected filters.</li>
              )}
            </ul>
          </article>
        </section>
    </div>
  );
}

