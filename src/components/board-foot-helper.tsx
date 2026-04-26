"use client";

import { useMemo, useState } from "react";

import {
  SPECIES_DENSITY,
  bfToLbs,
  densityFor,
  drynessKeyFromCode,
  formatBf,
  formatLbs,
  formatMbf,
  lbsToBf,
  lbsToMbf,
  maxMbfForLbsCap,
  type DrynessKey,
} from "@/lib/lumber-units";

type Props = {
  /** Optional: prefill species/dryness from the parent's lumber spec. */
  defaultSpeciesCode?: string;
  defaultDrynessCode?: string;
  /** Optional: receive auto-suggested weight (lbs) when user enters MBF/BF. */
  onSuggestWeightLbs?: (lbs: number) => void;
};

/**
 * Tiny BF / MBF ↔ lbs converter the post form opens inline.
 *
 * Sales people quote in BF/MBF; dispatch needs lbs to pick a trailer.
 * This widget keeps both sides honest using species density at the
 * shipped moisture content, plus a simple "max MBF for an 80,000-lb GVW"
 * sanity check.
 */
export function BoardFootHelper({
  defaultSpeciesCode = "SPF",
  defaultDrynessCode,
  onSuggestWeightLbs,
}: Props) {
  const [open, setOpen] = useState(false);
  const [species, setSpecies] = useState<string>(defaultSpeciesCode);
  const [dryness, setDryness] = useState<DrynessKey>(drynessKeyFromCode(defaultDrynessCode));
  const [bf, setBf] = useState<string>("");
  const [mbf, setMbf] = useState<string>("");
  const [lbsInput, setLbsInput] = useState<string>("");

  const density = useMemo(() => densityFor(species, dryness) ?? 30, [species, dryness]);

  const fromBfLbs = useMemo(() => bfToLbs(Number(bf || 0), density), [bf, density]);
  const fromMbfLbs = useMemo(() => bfToLbs(Number(mbf || 0) * 1000, density), [mbf, density]);
  const fromLbsBf = useMemo(() => lbsToBf(Number(lbsInput || 0), density), [lbsInput, density]);
  const fromLbsMbf = useMemo(() => lbsToMbf(Number(lbsInput || 0), density), [lbsInput, density]);
  const truckMbf80k = useMemo(() => maxMbfForLbsCap(80_000 - 32_000, density), [density]);

  return (
    <section className="rounded border border-emerald-200 bg-white/90 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-xs font-bold uppercase tracking-wide text-emerald-900">
          BF / MBF ↔ lbs converter
        </h4>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-[11px] font-medium text-emerald-800 underline hover:no-underline"
        >
          {open ? "Hide" : "Open converter"}
        </button>
      </div>
      {!open && (
        <p className="mt-1 text-[11px] text-zinc-500">
          Quick check: how many lbs is X MBF of {SPECIES_DENSITY.find((s) => s.code === species)?.species ?? species}?
          A typical 5-axle is ~48k lbs payload (≈{formatMbf(truckMbf80k)} MBF at this density).
        </p>
      )}
      {open && (
        <div className="mt-2 space-y-2">
          <div className="grid gap-2 sm:grid-cols-3">
            <label className="text-xs text-zinc-600">
              Species
              <select
                value={species}
                onChange={(e) => setSpecies(e.target.value)}
                className="mt-1 block w-full rounded border border-zinc-300 px-2 py-1.5 text-sm"
              >
                {SPECIES_DENSITY.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.species}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-zinc-600">
              Moisture
              <select
                value={dryness}
                onChange={(e) => setDryness(e.target.value as DrynessKey)}
                className="mt-1 block w-full rounded border border-zinc-300 px-2 py-1.5 text-sm"
              >
                <option value="KD">Kiln-dry / air-dry</option>
                <option value="GREEN">Green</option>
              </select>
            </label>
            <div className="text-xs text-zinc-600">
              Density used
              <div className="mt-1 rounded border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-sm font-semibold text-zinc-800">
                {density} lb/cu&nbsp;ft
              </div>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <label className="text-xs text-zinc-600">
              Board feet (BF) →
              <input
                inputMode="decimal"
                value={bf}
                onChange={(e) => setBf(e.target.value)}
                className="mt-1 block w-full rounded border border-zinc-300 px-2 py-1.5 text-sm"
                placeholder="e.g. 9000"
              />
              <div className="mt-1 text-[11px] text-zinc-600">
                ≈ <span className="font-semibold">{formatLbs(fromBfLbs)} lbs</span>
              </div>
            </label>

            <label className="text-xs text-zinc-600">
              MBF →
              <input
                inputMode="decimal"
                value={mbf}
                onChange={(e) => setMbf(e.target.value)}
                className="mt-1 block w-full rounded border border-zinc-300 px-2 py-1.5 text-sm"
                placeholder="e.g. 12.5"
              />
              <div className="mt-1 flex items-center justify-between text-[11px] text-zinc-600">
                <span>
                  ≈ <span className="font-semibold">{formatLbs(fromMbfLbs)} lbs</span>
                </span>
                {onSuggestWeightLbs && fromMbfLbs > 0 && (
                  <button
                    type="button"
                    onClick={() => onSuggestWeightLbs(Math.round(fromMbfLbs))}
                    className="rounded border border-emerald-600 bg-emerald-50 px-1.5 py-0.5 font-semibold text-emerald-800 hover:bg-emerald-100"
                  >
                    Use as load weight
                  </button>
                )}
              </div>
            </label>

            <label className="text-xs text-zinc-600">
              lbs →
              <input
                inputMode="numeric"
                value={lbsInput}
                onChange={(e) => setLbsInput(e.target.value)}
                className="mt-1 block w-full rounded border border-zinc-300 px-2 py-1.5 text-sm"
                placeholder="e.g. 44000"
              />
              <div className="mt-1 text-[11px] text-zinc-600">
                ≈ <span className="font-semibold">{formatBf(fromLbsBf)} BF</span> /{" "}
                <span className="font-semibold">{formatMbf(fromLbsMbf)} MBF</span>
              </div>
            </label>
          </div>

          <p className="text-[11px] text-zinc-500">
            Trucking sanity: a 5-axle tractor-trailer carries roughly 48,000 lbs payload
            (≈ {formatMbf(truckMbf80k)} MBF of this product). 6-/7-axle configs can carry
            more in MX/Tan/CW lanes. Densities are mid-range; final scale weights govern.
          </p>
        </div>
      )}
    </section>
  );
}
