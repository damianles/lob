"use client";

import { useState } from "react";

import { PlaceAutocomplete } from "@/components/place-autocomplete";
import { regionCodeForLob } from "@/lib/place-helpers";
import type { AnalyticsPeriod } from "@/lib/analytics";

type Props = {
  defaultPeriod: AnalyticsPeriod;
  defaultQuickLane: string;
  defaultOriginCity: string;
  defaultOriginState: string;
  defaultDestinationCity: string;
  defaultDestinationState: string;
  laneOptions: string[];
};

export function InsightsLanesFilterForm({
  defaultPeriod,
  defaultQuickLane,
  defaultOriginCity,
  defaultOriginState,
  defaultDestinationCity,
  defaultDestinationState,
  laneOptions,
}: Props) {
  const [originCity, setOriginCity] = useState(defaultOriginCity);
  const [originState, setOriginState] = useState(defaultOriginState);
  const [destCity, setDestCity] = useState(defaultDestinationCity);
  const [destState, setDestState] = useState(defaultDestinationState);
  const [quickLane, setQuickLane] = useState(defaultQuickLane);

  return (
    <form method="get" action="/insights/lanes" className="mt-5 rounded-lg border bg-white p-4">
      <p className="mb-3 text-xs text-zinc-500">
        Search a city pair to see <strong>market rates</strong> and volume. Example:{" "}
        <code className="rounded bg-zinc-100 px-1">Fort McMurray, AB -&gt; Edmonton, AB</code>
      </p>
      <input type="hidden" name="period" value={defaultPeriod} />
      <div className="grid gap-3 md:grid-cols-3">
        <input
          list="lane-options"
          name="quickLane"
          value={quickLane}
          onChange={(e) => setQuickLane(e.target.value)}
          className="rounded border px-3 py-2 text-sm md:col-span-3"
          placeholder="Fort McMurray, AB -> Edmonton, AB"
        />
        <datalist id="lane-options">
          {laneOptions.map((lane) => (
            <option value={lane} key={lane} />
          ))}
        </datalist>

        <div className="md:col-span-3">
          <PlaceAutocomplete
            mode="geocode"
            label="Search origin (Places)"
            placeholder="City, postal, or address…"
            onResolved={(p) => {
              if (p.city) setOriginCity(p.city);
              if (p.state) setOriginState(regionCodeForLob(p));
            }}
          />
        </div>
        <input
          name="originCity"
          value={originCity}
          onChange={(e) => setOriginCity(e.target.value)}
          className="rounded border px-3 py-2 text-sm"
          placeholder="Origin city"
        />
        <input
          name="originState"
          value={originState}
          onChange={(e) => setOriginState(e.target.value)}
          className="rounded border px-3 py-2 text-sm"
          placeholder="Origin state (WA)"
        />
        <div className="hidden sm:block" aria-hidden />
        <div className="md:col-span-3">
          <PlaceAutocomplete
            mode="geocode"
            label="Search destination (Places)"
            placeholder="City, postal, or address…"
            onResolved={(p) => {
              if (p.city) setDestCity(p.city);
              if (p.state) setDestState(regionCodeForLob(p));
            }}
          />
        </div>
        <input
          name="destinationCity"
          value={destCity}
          onChange={(e) => setDestCity(e.target.value)}
          className="rounded border px-3 py-2 text-sm"
          placeholder="Destination city"
        />
        <input
          name="destinationState"
          value={destState}
          onChange={(e) => setDestState(e.target.value)}
          className="rounded border px-3 py-2 text-sm"
          placeholder="Destination state (ID)"
        />
      </div>
      <button type="submit" className="mt-3 rounded-md bg-lob-navy px-4 py-2 text-sm font-semibold text-white hover:bg-lob-navy-hover">
        Update report
      </button>
    </form>
  );
}
