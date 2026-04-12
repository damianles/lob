"use client";

import { useState } from "react";

type FuelResponse = {
  origin: { state: string; usdPerGallon: number; source: string };
  destination: { state: string; usdPerGallon: number; source: string };
  blendedUsdPerGallon: number;
  note?: string;
};

export function FuelLaneForm() {
  const [originZip, setOriginZip] = useState("");
  const [destinationZip, setDestinationZip] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<FuelResponse | null>(null);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setData(null);
    const params = new URLSearchParams({ originZip, destinationZip });
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
    <section className="mt-6 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <form onSubmit={run} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold uppercase text-zinc-500">Origin ZIP</label>
            <input
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
              value={originZip}
              onChange={(e) => setOriginZip(e.target.value)}
              placeholder="97201"
              inputMode="numeric"
              maxLength={10}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-zinc-500">Destination ZIP</label>
            <input
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
              value={destinationZip}
              onChange={(e) => setDestinationZip(e.target.value)}
              placeholder="95814"
              inputMode="numeric"
              maxLength={10}
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-lob-navy px-4 py-2 text-sm font-semibold text-white hover:bg-lob-navy-hover disabled:opacity-60"
        >
          {loading ? "Working…" : "Show diesel snapshot"}
        </button>
      </form>

      {error && <p className="mt-4 text-sm text-red-700">{error}</p>}

      {data && (
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <article className="rounded border border-zinc-100 bg-zinc-50 p-3">
            <p className="text-xs font-semibold uppercase text-zinc-500">Origin ({data.origin.state})</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">${data.origin.usdPerGallon.toFixed(3)}</p>
            <p className="mt-1 text-xs text-zinc-500">per gallon (retail diesel, est.)</p>
          </article>
          <article className="rounded border border-zinc-100 bg-zinc-50 p-3">
            <p className="text-xs font-semibold uppercase text-zinc-500">Destination ({data.destination.state})</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">${data.destination.usdPerGallon.toFixed(3)}</p>
            <p className="mt-1 text-xs text-zinc-500">per gallon (retail diesel, est.)</p>
          </article>
          <article className="rounded border border-lob-gold/40 bg-lob-paper p-3">
            <p className="text-xs font-semibold uppercase text-lob-navy">Blended average</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-lob-navy">
              ${data.blendedUsdPerGallon.toFixed(3)}
            </p>
            <p className="mt-1 text-xs text-zinc-600">Simple mean of origin and destination estimates</p>
          </article>
        </div>
      )}
      {data?.note && <p className="mt-4 text-xs text-zinc-500">{data.note}</p>}
    </section>
  );
}
