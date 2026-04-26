"use client";

import { useMemo, useState } from "react";

import {
  LUMBER_CERTIFICATION_OPTIONS,
  LUMBER_DRYNESS_OPTIONS,
  LUMBER_EDGE_PROFILE_OPTIONS,
  LUMBER_LOADING_METHOD_OPTIONS,
  LUMBER_PACKAGING_OPTIONS,
  LUMBER_PANEL_TYPE_OPTIONS,
  LUMBER_PRODUCT_CATEGORY_OPTIONS,
  LUMBER_SPECIES_OPTIONS,
  LUMBER_TREATMENT_OPTIONS,
  type LumberSpec,
} from "@/lib/lumber-spec";

type Props = {
  value: LumberSpec;
  onChange: (next: LumberSpec) => void;
};

function num(v: string): number | undefined {
  if (v.trim() === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Lumber-specific spec block for the supplier post-load form.
 *
 * Renders as a collapsible section. The fields shown adapt slightly based on
 * `productCategory` so a panel posting doesn't ask for nominal 2x size, etc.
 */
export function LumberSpecForm({ value, onChange }: Props) {
  const [open, setOpen] = useState(true);

  const set = <K extends keyof LumberSpec>(key: K, val: LumberSpec[K] | undefined) => {
    onChange({ ...value, [key]: val });
  };

  const toggleCert = (cert: string) => {
    const current = new Set(value.certifications ?? []);
    if (current.has(cert)) current.delete(cert);
    else current.add(cert);
    onChange({ ...value, certifications: [...current] });
  };

  const isPanel = value.productCategory === "PANELS" || value.productCategory === "ENGINEERED";
  const isBulk = value.productCategory === "PELLETS" || value.productCategory === "CHIPS";

  const lengthsText = useMemo(() => (value.lengthsFt ?? []).join(","), [value.lengthsFt]);

  return (
    <section className="rounded border border-emerald-200 bg-white/90 p-3">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <h4 className="text-xs font-bold uppercase tracking-wide text-emerald-900">
          Lumber details (product specifications)
        </h4>
        <span className="text-xs text-emerald-800">{open ? "Hide" : "Show"}</span>
      </button>
      <p className="mt-1 text-xs text-zinc-500">
        Carriers see exactly what they’re hauling — species, grade, dryness, treatment, certifications.
        Helps the right truck book the right load.
      </p>

      {open && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col text-xs text-zinc-600">
            Product category
            <select
              className="mt-1 rounded border px-2 py-2 text-sm"
              value={value.productCategory ?? ""}
              onChange={(e) => set("productCategory", (e.target.value || undefined) as LumberSpec["productCategory"])}
            >
              <option value="">— select —</option>
              {LUMBER_PRODUCT_CATEGORY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col text-xs text-zinc-600">
            Species
            <select
              className="mt-1 rounded border px-2 py-2 text-sm"
              value={value.species ?? ""}
              onChange={(e) => set("species", e.target.value || undefined)}
            >
              <option value="">— select —</option>
              {LUMBER_SPECIES_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col text-xs text-zinc-600">
            Grade
            <input
              className="mt-1 rounded border px-2 py-2 text-sm"
              placeholder="e.g. #2 & Btr, Stud, Select Structural, Premium"
              value={value.grade ?? ""}
              onChange={(e) => set("grade", e.target.value || undefined)}
            />
          </label>

          <label className="flex flex-col text-xs text-zinc-600">
            Dryness
            <select
              className="mt-1 rounded border px-2 py-2 text-sm"
              value={value.dryness ?? ""}
              onChange={(e) => set("dryness", e.target.value || undefined)}
            >
              <option value="">— select —</option>
              {LUMBER_DRYNESS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col text-xs text-zinc-600">
            Moisture content (%)
            <input
              type="number"
              step="0.1"
              className="mt-1 rounded border px-2 py-2 text-sm"
              placeholder="e.g. 12"
              value={value.moistureContentPct ?? ""}
              onChange={(e) => set("moistureContentPct", num(e.target.value))}
            />
          </label>

          <label className="flex flex-col text-xs text-zinc-600">
            Treatment
            <select
              className="mt-1 rounded border px-2 py-2 text-sm"
              value={value.treatment ?? ""}
              onChange={(e) => set("treatment", e.target.value || undefined)}
            >
              <option value="">— select —</option>
              {LUMBER_TREATMENT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col text-xs text-zinc-600 sm:col-span-2">
            Certifications (check all that apply)
            <div className="mt-1 flex flex-wrap gap-2">
              {LUMBER_CERTIFICATION_OPTIONS.map((c) => {
                const active = (value.certifications ?? []).includes(c.value);
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => toggleCert(c.value)}
                    className={`rounded-full border px-2.5 py-1 text-[11px] transition ${
                      active
                        ? "border-emerald-500 bg-emerald-100 text-emerald-900"
                        : "border-zinc-300 bg-white text-zinc-700 hover:border-emerald-300"
                    }`}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          </label>

          {!isPanel && !isBulk && (
            <>
              <label className="flex flex-col text-xs text-zinc-600">
                Nominal size
                <input
                  className="mt-1 rounded border px-2 py-2 text-sm"
                  placeholder="e.g. 2x4, 2x6, 4x4, 1x6 T&G"
                  value={value.nominalSize ?? ""}
                  onChange={(e) => set("nominalSize", e.target.value || undefined)}
                />
              </label>
              <label className="flex flex-col text-xs text-zinc-600">
                Thickness (in)
                <input
                  type="number"
                  step="0.125"
                  className="mt-1 rounded border px-2 py-2 text-sm"
                  value={value.thicknessIn ?? ""}
                  onChange={(e) => set("thicknessIn", num(e.target.value))}
                />
              </label>
              <label className="flex flex-col text-xs text-zinc-600">
                Width (in)
                <input
                  type="number"
                  step="0.125"
                  className="mt-1 rounded border px-2 py-2 text-sm"
                  value={value.widthIn ?? ""}
                  onChange={(e) => set("widthIn", num(e.target.value))}
                />
              </label>
              <label className="flex flex-col text-xs text-zinc-600">
                Length (ft)
                <input
                  type="number"
                  step="0.5"
                  className="mt-1 rounded border px-2 py-2 text-sm"
                  placeholder="single length, or use mixed below"
                  value={value.lengthFt ?? ""}
                  onChange={(e) => set("lengthFt", num(e.target.value))}
                />
              </label>
              <label className="flex flex-col text-xs text-zinc-600 sm:col-span-2">
                Mixed lengths (comma-separated, ft)
                <input
                  className="mt-1 rounded border px-2 py-2 text-sm"
                  placeholder="e.g. 8, 10, 12, 14, 16"
                  value={lengthsText}
                  onChange={(e) => {
                    const parts = e.target.value
                      .split(",")
                      .map((p) => Number(p.trim()))
                      .filter((n) => Number.isFinite(n) && n > 0);
                    set("lengthsFt", parts.length ? parts : undefined);
                  }}
                />
              </label>
              <label className="flex flex-col text-xs text-zinc-600">
                Edge profile
                <select
                  className="mt-1 rounded border px-2 py-2 text-sm"
                  value={value.edgeProfile ?? ""}
                  onChange={(e) => set("edgeProfile", e.target.value || undefined)}
                >
                  <option value="">— select —</option>
                  {LUMBER_EDGE_PROFILE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}

          {isPanel && (
            <>
              <label className="flex flex-col text-xs text-zinc-600">
                Panel type
                <select
                  className="mt-1 rounded border px-2 py-2 text-sm"
                  value={value.panelType ?? ""}
                  onChange={(e) => set("panelType", e.target.value || undefined)}
                >
                  <option value="">— select —</option>
                  {LUMBER_PANEL_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col text-xs text-zinc-600">
                Panel grade / spec
                <input
                  className="mt-1 rounded border px-2 py-2 text-sm"
                  placeholder='e.g. "1/2" Sheathing", "3/4" T&G", APA-rated'
                  value={value.panelGrade ?? ""}
                  onChange={(e) => set("panelGrade", e.target.value || undefined)}
                />
              </label>
              <label className="flex flex-col text-xs text-zinc-600">
                Panel size
                <input
                  className="mt-1 rounded border px-2 py-2 text-sm"
                  placeholder="e.g. 4x8, 4x9, 4x10"
                  value={value.panelSize ?? ""}
                  onChange={(e) => set("panelSize", e.target.value || undefined)}
                />
              </label>
              <label className="flex flex-col text-xs text-zinc-600">
                Thickness (in)
                <input
                  type="number"
                  step="0.125"
                  className="mt-1 rounded border px-2 py-2 text-sm"
                  value={value.thicknessIn ?? ""}
                  onChange={(e) => set("thicknessIn", num(e.target.value))}
                />
              </label>
            </>
          )}

          <label className="flex flex-col text-xs text-zinc-600">
            Bundles (count)
            <input
              type="number"
              className="mt-1 rounded border px-2 py-2 text-sm"
              value={value.bundleCount ?? ""}
              onChange={(e) => set("bundleCount", num(e.target.value))}
            />
          </label>
          <label className="flex flex-col text-xs text-zinc-600">
            Pieces (count)
            <input
              type="number"
              className="mt-1 rounded border px-2 py-2 text-sm"
              value={value.pieceCount ?? ""}
              onChange={(e) => set("pieceCount", num(e.target.value))}
            />
          </label>
          <label className="flex flex-col text-xs text-zinc-600">
            Total board feet (BF)
            <input
              type="number"
              className="mt-1 rounded border px-2 py-2 text-sm"
              value={value.boardFeet ?? ""}
              onChange={(e) => set("boardFeet", num(e.target.value))}
            />
          </label>
          <label className="flex flex-col text-xs text-zinc-600">
            MBF (1000 BF)
            <input
              type="number"
              step="0.1"
              className="mt-1 rounded border px-2 py-2 text-sm"
              value={value.mbf ?? ""}
              onChange={(e) => set("mbf", num(e.target.value))}
            />
          </label>

          <label className="flex flex-col text-xs text-zinc-600">
            Packaging
            <select
              className="mt-1 rounded border px-2 py-2 text-sm"
              value={value.packaging ?? ""}
              onChange={(e) => set("packaging", e.target.value || undefined)}
            >
              <option value="">— select —</option>
              {LUMBER_PACKAGING_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col text-xs text-zinc-600">
            Loading method
            <select
              className="mt-1 rounded border px-2 py-2 text-sm"
              value={value.loadingMethod ?? ""}
              onChange={(e) => set("loadingMethod", e.target.value || undefined)}
            >
              <option value="">— select —</option>
              {LUMBER_LOADING_METHOD_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <div className="sm:col-span-2 lg:col-span-4">
            <p className="text-xs font-semibold text-zinc-700">Special handling</p>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-2 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={value.millTallyRequired ?? false}
                  onChange={(e) => set("millTallyRequired", e.target.checked || undefined)}
                />
                Mill tally / kiln tickets required at delivery
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={value.fragile ?? false}
                  onChange={(e) => set("fragile", e.target.checked || undefined)}
                />
                Fragile (millwork / finished)
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={value.weatherSensitive ?? false}
                  onChange={(e) => set("weatherSensitive", e.target.checked || undefined)}
                />
                Weather-sensitive (must tarp)
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={value.exportShipment ?? false}
                  onChange={(e) => set("exportShipment", e.target.checked || undefined)}
                />
                Export shipment
              </label>
            </div>
          </div>

          <label className="flex flex-col text-xs text-zinc-600 sm:col-span-2 lg:col-span-4">
            Lumber notes (visible to carriers)
            <textarea
              rows={2}
              className="mt-1 rounded border px-2 py-2 text-sm"
              placeholder="Anything specific to this load — bunks, dunnage, mixed sizes, FOB terms, etc."
              value={value.notes ?? ""}
              onChange={(e) => set("notes", e.target.value || undefined)}
            />
          </label>
        </div>
      )}
    </section>
  );
}
