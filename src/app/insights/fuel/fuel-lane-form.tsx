"use client";

import { useEffect, useMemo, useState } from "react";

import { RadioChoice } from "@/components/ui/radio-choice";

type QuoteUs = {
  country: "US";
  label: string;
  usdPerGallon: number;
  source: string;
};

type QuoteCa = {
  country: "CA";
  label: string;
  province: string;
  cadPerLitre: number;
  usdPerGallonEquivalent: number;
  source: string;
};

type LegalFuelSourceRow = {
  id: string;
  name: string;
  documentationUrl: string;
  offers: string;
};

type FuelResponse = {
  origin: QuoteUs | QuoteCa;
  destination: QuoteUs | QuoteCa;
  blendedUsdPerGallon: number;
  note?: string;
  liveUsWeeklyRetail?: {
    usdPerGallon: number;
    period: string;
    provider: string;
    href: string;
  } | null;
  legalDieselDataSources?: LegalFuelSourceRow[];
};

function QuoteCard({ title, q }: { title: string; q: QuoteUs | QuoteCa }) {
  if (q.country === "US") {
    return (
      <article className="rounded-xl border border-stone-200/80 bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
          {title} · US · {q.label}
        </p>
        <p className="mt-2 text-2xl font-semibold tabular-nums text-lob-navy">${q.usdPerGallon.toFixed(3)}</p>
        <p className="mt-1 text-xs text-stone-500">USD per US gallon (est. retail diesel)</p>
      </article>
    );
  }
  return (
    <article className="rounded-xl border border-stone-200/80 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
        {title} · CA · {q.province} ({q.label})
      </p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-lob-navy">
        ${q.cadPerLitre.toFixed(2)} <span className="text-sm font-medium text-stone-500">CAD/L</span>
      </p>
      <p className="mt-1 text-xs text-stone-500">
        ≈ ${q.usdPerGallonEquivalent.toFixed(3)} USD/gal equivalent (LOB_CAD_TO_USD_RATE)
      </p>
    </article>
  );
}

export function FuelLaneForm() {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<FuelResponse | null>(null);
  const [blendDisplay, setBlendDisplay] = useState<"usd_gal" | "cad_l">("usd_gal");

  const blendedCadL = useMemo(() => {
    if (!data) return null;
    if (data.origin.country === "CA" && data.destination.country === "CA") {
      return (data.origin.cadPerLitre + data.destination.cadPerLitre) / 2;
    }
    return null;
  }, [data]);

  useEffect(() => {
    if (blendedCadL == null) setBlendDisplay("usd_gal");
  }, [blendedCadL]);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setData(null);
    const params = new URLSearchParams({ origin, destination });
    const res = await fetch(`/api/insights/fuel?${params}`);
    const json = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(typeof json.error === "string" ? json.error : "Request failed.");
      return;
    }
    setData(json.data as FuelResponse);
  }

  return (
    <section className="mt-6 rounded-2xl border border-stone-200/60 bg-stone-50/40 p-5 sm:p-6">
      <form onSubmit={run} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-stone-500">
              Origin · US ZIP or CA postal
            </label>
            <input
              className="mt-1.5 w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              placeholder="97201 or T2P 1J4"
              autoComplete="postal-code"
              maxLength={12}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-stone-500">
              Destination · US ZIP or CA postal
            </label>
            <input
              className="mt-1.5 w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="95814 or V6B 1A1"
              autoComplete="postal-code"
              maxLength={12}
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-lob-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-lob-navy-hover disabled:opacity-60"
        >
          {loading ? "Working…" : "Show diesel snapshot"}
        </button>
      </form>

      {error && <p className="mt-4 text-sm text-red-700">{error}</p>}

      {data && (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <QuoteCard title="Origin" q={data.origin} />
            <QuoteCard title="Destination" q={data.destination} />
          </div>
          <div className="mt-4">
            <RadioChoice
              label="Blended average display"
              name="blend-unit"
              value={blendDisplay}
              onChange={setBlendDisplay}
              options={
                blendedCadL != null
                  ? [
                      { value: "usd_gal" as const, label: "USD / US gallon" },
                      { value: "cad_l" as const, label: "CAD / litre (CA–CA only)" },
                    ]
                  : [{ value: "usd_gal" as const, label: "USD / US gallon" }]
              }
            />
          </div>
          {data.liveUsWeeklyRetail && (
            <article className="mt-4 rounded-xl border border-sky-200/80 bg-sky-50/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-sky-950">Live U.S. benchmark (weekly)</p>
              <p className="mt-2 text-xl font-semibold tabular-nums text-sky-950">
                ${data.liveUsWeeklyRetail.usdPerGallon.toFixed(3)}{" "}
                <span className="text-sm font-medium text-sky-800/90">USD/gal</span>
              </p>
              <p className="mt-1 text-xs text-sky-900/85">
                {data.liveUsWeeklyRetail.provider} national average, week of {data.liveUsWeeklyRetail.period}. Compare to
                your lane blend above — not a pump price on your route.
              </p>
              <a
                className="mt-2 inline-block text-xs font-medium text-sky-900 underline"
                href={data.liveUsWeeklyRetail.href}
                target="_blank"
                rel="noreferrer"
              >
                EIA Open Data
              </a>
            </article>
          )}

          <article className="mt-4 rounded-xl border border-lob-gold/35 bg-lob-paper/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-lob-navy">Blended planning average</p>
            {blendDisplay === "usd_gal" || blendedCadL == null ? (
              <p className="mt-2 text-2xl font-semibold tabular-nums text-lob-navy">
                ${data.blendedUsdPerGallon.toFixed(3)} <span className="text-sm font-medium text-stone-600">USD/gal eq.</span>
              </p>
            ) : (
              <p className="mt-2 text-2xl font-semibold tabular-nums text-lob-navy">
                ${blendedCadL.toFixed(2)} <span className="text-sm font-medium text-stone-600">CAD/L mean</span>
              </p>
            )}
            <p className="mt-1 text-xs text-stone-600">Simple mean of both ends — not a route-weighted average.</p>
          </article>
        </>
      )}
      {data?.note && <p className="mt-4 text-xs leading-relaxed text-stone-500">{data.note}</p>}

      {data?.legalDieselDataSources && data.legalDieselDataSources.length > 0 && (
        <details className="mt-4 rounded-lg border border-stone-200/80 bg-white p-3 text-xs text-stone-600">
          <summary className="cursor-pointer font-semibold text-stone-800">Where live diesel data comes from (legally)</summary>
          <ul className="mt-2 space-y-1.5">
            {data.legalDieselDataSources.map((s) => (
              <li key={s.id}>
                <a className="font-medium text-lob-navy underline" href={s.documentationUrl} target="_blank" rel="noreferrer">
                  {s.name}
                </a>
                {" — "}
                {s.offers}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
