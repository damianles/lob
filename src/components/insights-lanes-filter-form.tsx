"use client";

import { useState } from "react";

import { PlaceAutocomplete } from "@/components/place-autocomplete";
import { regionCodeForLob } from "@/lib/place-helpers";
import type { AnalyticsPeriod } from "@/lib/analytics";

const periods: { value: AnalyticsPeriod; label: string }[] = [
  { value: "week", label: "Week by week (7d)" },
  { value: "30d", label: "30 days" },
  { value: "60d", label: "60 days" },
  { value: "90d", label: "90 days" },
  { value: "yoy", label: "Year over year (365d)" },
];

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
        The <strong>period</strong> dropdown shapes the summary cards and charts below. The green{" "}
        <strong>booked lanes</strong> table always compares the last 30, 60, and 90 days from today (live bookings
        only).
      </p>
      <div className="grid gap-3 md:grid-cols-3">
        <select name="period" defaultValue={defaultPeriod} className="rounded border px-3 py-2 text-sm">
          {periods.map((p) => (
            <option value={p.value} key={p.value}>
              {p.label}
            </option>
          ))}
        </select>

        <input
          list="lane-options"
          name="quickLane"
          value={quickLane}
          onChange={(e) => setQuickLane(e.target.value)}
          className="rounded border px-3 py-2 text-sm md:col-span-2"
          placeholder="Quick type lane: Seattle, WA -> Boise, ID"
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
