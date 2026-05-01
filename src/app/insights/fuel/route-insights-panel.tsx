"use client";

import { useState, type FormEvent } from "react";

import { PlaceAutocomplete } from "@/components/place-autocomplete";

type Directions =
  | {
      ok: true;
      distanceMiles: number;
      distanceKm: number;
      durationText: string;
      stepSummaries: string[];
    }
  | { ok: false; reason: string };

type LegalFuelRow = {
  id: string;
  name: string;
  publisher: string;
  cadence: string;
  geography: string;
  offers: string;
  integration: string;
  documentationUrl: string;
};

type LegalAlertRow = {
  id: string;
  name: string;
  publisher: string;
  offers: string;
  integration: string;
  documentationUrl: string;
};

type PanelResponse = {
  directions: Directions;
  legalDieselDataSources: LegalFuelRow[];
  legalRouteAlertSources: LegalAlertRow[];
  routeFuel: {
    status: string;
    title: string;
    summary: string;
    benchmarks: {
      id: string;
      label: string;
      usdPerGallon: number;
      period: string;
      provider: string;
      href: string;
    }[];
    perStopRanking: { status: string; detail: string };
  };
  routeAlerts: {
    status: string;
    title: string;
    summary: string;
    checklist: string[];
  };
  ethicsNote: string;
};

export function RouteInsightsPanel() {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PanelResponse | null>(null);

  async function run(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch("/api/insights/route-planning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ origin, destination }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : "Request failed.");
        return;
      }
      setData(json.data as PanelResponse);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mt-10 rounded-2xl border border-stone-200/60 bg-white p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-lob-navy">Route distance · fuel · alerts</h2>
      <p className="mt-2 text-sm leading-relaxed text-stone-600">
        Enter places (city + province/state, postal/ZIP, or landmark). With{" "}
        <code className="rounded bg-stone-100 px-1 text-xs">GOOGLE_MAPS_API_KEY</code> you get driving distance and
        steps. With <code className="rounded bg-stone-100 px-1 text-xs">EIA_API_KEY</code> you get the official{" "}
        <strong>U.S. weekly national diesel average</strong> as a benchmark — not station-level prices. Per-stop
        ranking uses <strong>licensed</strong> data (fleet card, OPIS, etc.), not scraped retail sites.
      </p>

      <form onSubmit={run} className="mt-4 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <PlaceAutocomplete
              mode="geocode"
              label="Origin (search with Places, or type below)"
              placeholder="Calgary, AB or T2P 1J4…"
              onResolved={(p) => {
                setOrigin(
                  p.formattedAddress || [p.city, p.state, p.zip].filter(Boolean).join(", "),
                );
              }}
            />
            <label className="mt-2 block text-xs font-semibold uppercase text-stone-500">Origin (for route)</label>
            <input
              className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              placeholder="Calgary AB or T2P 1J4"
            />
          </div>
          <div>
            <PlaceAutocomplete
              mode="geocode"
              label="Destination (search with Places, or type below)"
              placeholder="Portland, OR or 97201…"
              onResolved={(p) => {
                setDestination(
                  p.formattedAddress || [p.city, p.state, p.zip].filter(Boolean).join(", "),
                );
              }}
            />
            <label className="mt-2 block text-xs font-semibold uppercase text-stone-500">Destination (for route)</label>
            <input
              className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Portland OR or 97201"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-stone-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-60"
        >
          {loading ? "Analyzing…" : "Plan route"}
        </button>
      </form>

      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}

      {data && (
        <div className="mt-6 space-y-5 text-sm">
          {data.directions.ok ? (
            <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-4">
              <p className="font-semibold text-emerald-950">Driving summary</p>
              <p className="mt-1 text-emerald-900/90">
                ≈ {data.directions.distanceMiles} mi ({data.directions.distanceKm} km) · {data.directions.durationText}
              </p>
              <ul className="mt-2 max-h-40 list-inside list-disc space-y-1 overflow-y-auto text-xs text-emerald-900/85">
                {data.directions.stepSummaries.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-amber-950">
              <p className="font-semibold">Directions not available</p>
              <p className="mt-1 text-xs">
                {data.directions.reason === "not_configured"
                  ? "Add GOOGLE_MAPS_API_KEY (Directions API enabled) to your environment to see live distance and steps."
                  : `Google returned: ${data.directions.reason}`}
              </p>
            </div>
          )}

          <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-4">
            <p className="font-semibold text-lob-navy">{data.routeFuel.title}</p>
            <p className="mt-2 text-xs leading-relaxed text-stone-600">{data.routeFuel.summary}</p>
            {data.routeFuel.benchmarks.length > 0 && (
              <ul className="mt-3 space-y-2 border-t border-stone-200/80 pt-3 text-xs">
                {data.routeFuel.benchmarks.map((b) => (
                  <li key={b.id} className="text-stone-700">
                    <span className="font-semibold text-lob-navy tabular-nums">${b.usdPerGallon.toFixed(3)} USD/gal</span>
                    {" · "}
                    {b.label}
                    <span className="text-stone-500"> — week of {b.period}</span>
                    {" · "}
                    <a className="text-lob-navy underline" href={b.href} target="_blank" rel="noreferrer">
                      Data source
                    </a>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs leading-relaxed text-stone-500">{data.routeFuel.perStopRanking.detail}</p>
          </div>

          <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-4">
            <p className="font-semibold text-lob-navy">{data.routeAlerts.title}</p>
            <p className="mt-2 text-xs leading-relaxed text-stone-600">{data.routeAlerts.summary}</p>
            <ul className="mt-3 list-inside list-disc space-y-1.5 text-xs text-stone-600">
              {data.routeAlerts.checklist.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          </div>

          <details className="rounded-xl border border-stone-200/80 bg-white p-3 text-xs text-stone-600">
            <summary className="cursor-pointer font-semibold text-stone-800">Legal diesel data sources (reference)</summary>
            <ul className="mt-2 space-y-2 pl-1">
              {data.legalDieselDataSources.map((s) => (
                <li key={s.id}>
                  <span className="font-medium text-stone-800">{s.name}</span> — {s.offers}{" "}
                  <a className="text-lob-navy underline" href={s.documentationUrl} target="_blank" rel="noreferrer">
                    Docs
                  </a>
                </li>
              ))}
            </ul>
          </details>

          <details className="rounded-xl border border-stone-200/80 bg-white p-3 text-xs text-stone-600">
            <summary className="cursor-pointer font-semibold text-stone-800">Legal route alert sources (reference)</summary>
            <ul className="mt-2 space-y-2 pl-1">
              {data.legalRouteAlertSources.map((s) => (
                <li key={s.id}>
                  <span className="font-medium text-stone-800">{s.name}</span> — {s.offers}{" "}
                  <a className="text-lob-navy underline" href={s.documentationUrl} target="_blank" rel="noreferrer">
                    Docs
                  </a>
                </li>
              ))}
            </ul>
          </details>

          <p className="text-xs leading-relaxed text-stone-500">{data.ethicsNote}</p>
        </div>
      )}
    </section>
  );
}
