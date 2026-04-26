"use client";

import { useEffect, useState } from "react";

/**
 * Renders four hidden <datalist>s seeded with the shipper's own historical
 * address triples (origin/destination city + state + zip). Once mounted
 * any <input list="recent-origin-cities"> on the page gets a free
 * dropdown of values the user has actually used before.
 *
 * Uses native HTML <datalist> on purpose — it's accessible, mobile-friendly,
 * works without JS framework deps, and follows the user's typing.
 *
 * Datalist IDs:
 *   - recent-origin-cities      / recent-origin-states      / recent-origin-zips
 *   - recent-destination-cities / recent-destination-states / recent-destination-zips
 */

type AddressRow = {
  city: string;
  state: string;
  zip: string;
  count: number;
  lastUsedAt: string;
};

type Recent = { origins: AddressRow[]; destinations: AddressRow[] };

export function AddressDataLists() {
  const [data, setData] = useState<Recent>({ origins: [], destinations: [] });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const r = await fetch("/api/lanes/recent-addresses");
        if (!r.ok) return;
        const j = await r.json();
        if (!cancelled) setData({ origins: j.origins ?? [], destinations: j.destinations ?? [] });
      } catch {
        // best-effort — autocomplete is a nice-to-have, not blocking
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const uniq = (xs: string[]) => [...new Set(xs.filter(Boolean))];
  const originCities = uniq(data.origins.map((o) => o.city));
  const originStates = uniq(data.origins.map((o) => o.state));
  const originZips = uniq(data.origins.map((o) => o.zip));
  const destCities = uniq(data.destinations.map((o) => o.city));
  const destStates = uniq(data.destinations.map((o) => o.state));
  const destZips = uniq(data.destinations.map((o) => o.zip));

  // Datalists render no visible UI but get referenced by inputs via `list=`.
  return (
    <>
      <datalist id="recent-origin-cities">
        {originCities.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      <datalist id="recent-origin-states">
        {originStates.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      <datalist id="recent-origin-zips">
        {originZips.map((z) => (
          <option key={z} value={z} />
        ))}
      </datalist>
      <datalist id="recent-destination-cities">
        {destCities.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      <datalist id="recent-destination-states">
        {destStates.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      <datalist id="recent-destination-zips">
        {destZips.map((z) => (
          <option key={z} value={z} />
        ))}
      </datalist>
    </>
  );
}
