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
        <h1 className="text-2xl font-bold">Lane Rate Analytics</h1>
        <p className="mt-2 text-sm text-zinc-600">Please sign in to access insights.</p>
      </div>
    );
  }
  if (!actor.companyId && actor.role !== "ADMIN") {
    return (
      <div className="max-w-3xl">
        <h1 className="text-2xl font-bold">Lane Rate Analytics</h1>
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
        <h1 className="text-2xl font-bold">Lane Rate Analytics (subscriber)</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Full lane Insights (history, YoY, spreadsheets) will be a monthly add-on — lumber-only, the way DAT
          charges for RateView. We are still gathering enough booked forest-product moves to make that trustworthy.
          Until then, average rate, your last book on the lane, and the allowed bid band show on each load when you
          post, book, or bid.
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
            <h1 className="text-2xl font-bold sm:text-3xl">Lane Rates &amp; Trends</h1>
            <p className="mt-2 text-sm text-zinc-600">
              Market rates and historical load volumes by city pair. Amounts are <strong>{displayCurrency}</strong>
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
          <h2 className="text-lg font-semibold text-zinc-900">Market rates</h2>
          <p className="mt-1 text-sm text-zinc-600">Typical rate and historical volume by city pair.</p>
          {overview.spreadsheetBenchmarks.cityLevel.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500">
              {originCity || destinationCity || quickLane
                ? "No market rates matched this search. Try Fort McMurray, AB -> Edmonton, AB in the quick-lane box."
                : "No market rates available."}
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
                  {row.sourceSampleCount != null && (
                    <div className="mt-0.5 text-[11px] text-zinc-500">
                      {row.sourceSampleCount.toLocaleString()} loads
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <KPICardGrid className="mt-6">
          <KPICard
            title={`Average rate (${displayCurrency})`}
            value={formatMoney(overview.pricing.averageRateUsd, displayCurrency)}
            subtitle="Market rate"
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
          />
        </KPICardGrid>

        <section className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
          <h2 className="text-lg font-semibold text-zinc-900">Coming as freight moves on LOB</h2>
          <p className="mt-2 max-w-3xl text-sm text-zinc-600">
            Live analytics will appear here as loads are posted and booked on this board — posting volume, lane mix,
            equipment, preferred origins and destinations, and booked-rate trends including 30 / 60 / 90 day averages.
            Until then, market rates above are the working figures.
          </p>
        </section>
    </div>
  );
}

