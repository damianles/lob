import Link from "next/link";

import { KPICard, KPICardGrid } from "@/components/ui/kpi-card";
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

        <KPICardGrid className="mt-6">
          <KPICard
            title="Average rate"
            value={formatMoney(overview.pricing.averageRateUsd)}
            change={formatPct(overview.pricing.yoyRateChangePct)}
            trend={
              overview.pricing.yoyRateChangePct === null
                ? "neutral"
                : overview.pricing.yoyRateChangePct > 0
                  ? "up"
                  : "down"
            }
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
            subtitle="Year-over-year change"
          />
          <KPICard
            title="Loads posted"
            value={overview.volume.loadsPosted}
            subtitle={`${overview.volume.loadsDelivered} delivered`}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            }
          />
          <KPICard
            title="Bookings"
            value={overview.volume.bookings}
            subtitle={`${overview.frequency.bookingsPerWeek.toFixed(1)} per week`}
            change={formatPct(overview.frequency.yoyBookingChangePct)}
            trend={
              overview.frequency.yoyBookingChangePct === null
                ? "neutral"
                : overview.frequency.yoyBookingChangePct > 0
                  ? "up"
                  : "down"
            }
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
          />
          <KPICard
            title="Total volume"
            value={`${overview.volume.totalWeightLbs.toLocaleString()} lbs`}
            subtitle={`Booking YoY: ${formatPct(overview.frequency.yoyBookingChangePct)}`}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
                />
              </svg>
            }
          />
        </KPICardGrid>

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
            <h2 className="text-lg font-semibold">Base lane averages vs your bookings</h2>
            <p className="mt-1 text-xs text-zinc-500">
              <strong>State rows</strong> are one number per origin/destination <em>province or state</em> (all city pairs
              in the posted-load sheets rolled together). <strong>City rows</strong> are specific origin/destination
              cities—your &quot;avg booked&quot; is matched to the <em>same</em> cities when those fields exist, so it is
              not the same as the provincial row for the same states. Source file:{" "}
              <code className="rounded bg-zinc-100 px-1">data/market-benchmarks.json</code> — rebuild from your XLSX with{" "}
              <code className="rounded bg-zinc-100 px-1">npx tsx scripts/build-benchmarks-from-posted-xlsx.ts</code>.
              Fair-rate code also uses the DB window when enough samples exist (
              <code className="rounded bg-zinc-100 px-1">LOB_MIN_SAMPLES_FOR_DB_BENCHMARK</code>).
            </p>
            <h3 className="mt-4 text-sm font-semibold text-zinc-800">Provincial / state aggregates</h3>
            <ul className="mt-2 max-h-48 space-y-2 overflow-auto text-sm">
              {overview.spreadsheetBenchmarks.stateLevel.map((row) => (
                <li key={row.rowKey} className="border-b border-zinc-100 pb-2">
                  <div className="font-medium leading-snug">{row.laneLabel}</div>
                  <div className="mt-0.5 text-[11px] text-zinc-500">Equipment: {row.equipmentType}</div>
                  <div className="mt-1 text-xs text-zinc-600">
                    Benchmark {formatMoney(row.benchmarkAvgUsd)}
                    {row.sourceSampleCount != null && ` · ${row.sourceSampleCount.toLocaleString()} rows in source sheet`}
                    {row.yourBookedAvgUsd != null && (
                      <>
                        {" "}
                        · Your avg {formatMoney(row.yourBookedAvgUsd)} ({row.bookingCount} bookings in period)
                        {row.deltaVsBenchmarkPct != null && (
                          <span> · {formatPct(row.deltaVsBenchmarkPct)} vs benchmark</span>
                        )}
                      </>
                    )}
                    {row.yourBookedAvgUsd == null && <span> · No matching bookings in this period &amp; filters</span>}
                  </div>
                </li>
              ))}
            </ul>
            <h3 className="mt-4 text-sm font-semibold text-zinc-800">City-pair lines (from spreadsheet)</h3>
            <p className="mt-0.5 text-[11px] text-zinc-500">
              Each line is a different origin/destination <em>city</em> with the same states—benchmark $ varies by lane.
            </p>
            <ul className="mt-2 max-h-64 space-y-2 overflow-auto text-sm">
              {overview.spreadsheetBenchmarks.cityLevel.map((row) => (
                <li key={row.rowKey} className="border-b border-zinc-100 pb-2">
                  <div className="font-medium leading-snug">{row.laneLabel}</div>
                  <div className="mt-0.5 text-[11px] text-zinc-500">Equipment: {row.equipmentType}</div>
                  <div className="mt-1 text-xs text-zinc-600">
                    Benchmark {formatMoney(row.benchmarkAvgUsd)}
                    {row.sourceSampleCount != null && ` · ${row.sourceSampleCount.toLocaleString()} rows in source sheet`}
                    {row.yourBookedAvgUsd != null && (
                      <>
                        {" "}
                        · Your avg {formatMoney(row.yourBookedAvgUsd)} ({row.bookingCount} on this city lane in period)
                        {row.deltaVsBenchmarkPct != null && (
                          <span> · {formatPct(row.deltaVsBenchmarkPct)} vs benchmark</span>
                        )}
                      </>
                    )}
                    {row.yourBookedAvgUsd == null && (
                      <span> · No booked loads on this exact city lane in period</span>
                    )}
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

