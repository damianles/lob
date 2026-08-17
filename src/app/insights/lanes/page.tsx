import Link from "next/link";
import { cookies } from "next/headers";

import { DisplayCurrencyPreference } from "@/components/display-currency-preference";
import { InsightsLanesFilterForm } from "@/components/insights-lanes-filter-form";
import { KPICard, KPICardGrid } from "@/components/ui/kpi-card";
import { getAnalyticsOverview, getLaneQuickOptions, type AnalyticsPeriod } from "@/lib/analytics";
import { DISPLAY_CURRENCY_COOKIE, parseDisplayCurrency } from "@/lib/display-currency";
import { formatMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { getActorContext } from "@/lib/request-context";

export const dynamic = "force-dynamic";

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

  const jar = await cookies();
  const displayCurrency = parseDisplayCurrency(jar.get(DISPLAY_CURRENCY_COOKIE)?.value);

  const [overview, laneOptions] = await Promise.all([
    getAnalyticsOverview(
      { role: actor.role, companyId: actor.companyId },
      { period, originCity, originState, destinationCity, destinationState, quickLane },
      displayCurrency,
    ),
    getLaneQuickOptions(80),
  ]);

  return (
    <div className="mx-auto max-w-6xl text-zinc-900">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">Lane rates &amp; trends</h1>
            <p className="mt-2 text-sm text-zinc-600">
              Current rates come from the wholesaler posted-loads file. Live LOB bookings replace a city pair once it
              has {overview.pricing.washOutAt}+ bookings in the selected period. Amounts are{" "}
              <strong>{displayCurrency}</strong>
              {displayCurrency === "CAD" ? " (Canada-first)." : "."} Canada–Canada is CAD; US–US is USD.
            </p>
          </div>
          <DisplayCurrencyPreference compact />
        </div>

        <InsightsLanesFilterForm
          defaultPeriod={period}
          defaultQuickLane={quickLane}
          defaultOriginCity={originCity}
          defaultOriginState={originState}
          defaultDestinationCity={destinationCity}
          defaultDestinationState={destinationState}
          laneOptions={laneOptions}
        />

        <section className="mt-6 rounded-lg border border-zinc-200 bg-white p-4">
          <h2 className="text-lg font-semibold text-zinc-900">Current lane averages</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Wholesaler file is the working data set. A lane switches to live LOB when it has{" "}
            {overview.pricing.washOutAt}+ bookings here in the selected period.
          </p>
          {overview.spreadsheetBenchmarks.cityLevel.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500">
              {originCity || destinationCity || quickLane
                ? "No city pair in the file matched this search. Try Fort McMurray, AB -> Edmonton, AB in the quick-lane box."
                : "No city-pair rows in the benchmark file."}
            </p>
          ) : (
            <ul className="mt-3 max-h-[28rem] space-y-2 overflow-auto text-sm">
              {overview.spreadsheetBenchmarks.cityLevel.map((row) => (
                <li key={row.rowKey} className="border-b border-zinc-100 pb-2">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div className="font-medium leading-snug text-zinc-900">{row.laneLabel}</div>
                    <div className="tabular-nums font-semibold text-zinc-900">
                      {formatMoney(row.effectiveAvgUsd, displayCurrency)}
                    </div>
                  </div>
                  <div className="mt-0.5 text-[11px] text-zinc-500">
                    {row.rateSource === "live"
                      ? `Live LOB · ${row.bookingCount} bookings (replaced file)`
                      : `Wholesaler file${row.sourceSampleCount != null ? ` · ${row.sourceSampleCount.toLocaleString()} rows` : ""}`}
                    {row.rateSource === "live" && row.sourceSampleCount != null && (
                      <> · file was {formatMoney(row.benchmarkAvgUsd, displayCurrency)}</>
                    )}
                    {row.rateSource === "file" && row.yourBookedAvgUsd != null && (
                      <>
                        {" "}
                        · LOB so far {formatMoney(row.yourBookedAvgUsd, displayCurrency)} ({row.bookingCount}/
                        {overview.pricing.washOutAt} to replace)
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <KPICardGrid className="mt-6">
          <KPICard
            title={`Average rate (${displayCurrency})`}
            value={formatMoney(overview.pricing.averageRateUsd, displayCurrency)}
            change={
              overview.pricing.rateSource === "live" ? formatPct(overview.pricing.yoyRateChangePct) : undefined
            }
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
            subtitle={
              overview.pricing.rateSource === "file"
                ? `Wholesaler file · live replaces a lane at ${overview.pricing.washOutAt}+ LOB bookings`
                : "LOB bookings on this lane"
            }
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
          <h2 className="text-lg font-semibold text-emerald-950">Live LOB overlay — 30 / 60 / 90 day booked averages</h2>
          <p className="mt-2 max-w-3xl text-sm text-emerald-900/90">
            Overlay only — not the working rate set. These numbers come from loads <strong>booked on LOB</strong>. A
            city pair in the list above switches from the wholesaler file to live once it has{" "}
            {overview.pricing.washOutAt}+ bookings in the selected period. Each column is a separate window (last 30,
            60, or 90 days), not nested.
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
                        ? formatMoney(row.last30Days.averageAgreedRateUsd, displayCurrency)
                        : "—"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{row.last60Days.bookingCount}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-medium">
                      {row.last60Days.averageAgreedRateUsd != null
                        ? formatMoney(row.last60Days.averageAgreedRateUsd, displayCurrency)
                        : "—"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{row.last90Days.bookingCount}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-medium">
                      {row.last90Days.averageAgreedRateUsd != null
                        ? formatMoney(row.last90Days.averageAgreedRateUsd, displayCurrency)
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {overview.bookedLaneExplorer.length === 0 && (
              <p className="p-6 text-center text-sm text-zinc-500">
                No bookings on LOB in the last 90 days for this search. Current rates stay on the wholesaler file
                above until a city pair reaches {overview.pricing.washOutAt}+ live bookings.
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
                    {t.bookings} bookings | {formatMoney(t.averageRate, displayCurrency)}
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

        <section className="mt-6">
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

