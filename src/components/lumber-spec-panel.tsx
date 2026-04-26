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

function labelOf(
  options: ReadonlyArray<{ value: string; label: string }>,
  value: string | undefined,
): string | null {
  if (!value) return null;
  return options.find((o) => o.value === value)?.label ?? value;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd className="mt-0.5 truncate text-sm text-zinc-900">{value}</dd>
    </div>
  );
}

export function LumberSpecPanel({
  spec,
  className,
}: {
  spec: LumberSpec | null | undefined;
  className?: string;
}) {
  if (!spec) return null;

  const lengths =
    spec.lengthsFt && spec.lengthsFt.length > 0
      ? `${spec.lengthsFt.join(" / ")} ft`
      : typeof spec.lengthFt === "number"
        ? `${spec.lengthFt} ft`
        : null;

  const dimension =
    spec.thicknessIn && spec.widthIn
      ? `${spec.thicknessIn} × ${spec.widthIn} in`
      : null;

  const certs = spec.certifications && spec.certifications.length > 0
    ? spec.certifications.map((c) => labelOf(LUMBER_CERTIFICATION_OPTIONS, c) ?? c).join(", ")
    : null;

  return (
    <section
      className={`rounded-lg border border-emerald-200/70 bg-gradient-to-br from-emerald-50/60 via-white to-white p-4 ${className ?? ""}`}
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-emerald-700 text-[11px] font-bold text-white">
          ✓
        </span>
        <h2 className="text-sm font-semibold tracking-tight text-zinc-900">Lumber details</h2>
        <span className="ml-auto text-[10px] font-medium uppercase tracking-wider text-emerald-800">
          Posted by supplier
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
        <Row label="Product" value={labelOf(LUMBER_PRODUCT_CATEGORY_OPTIONS, spec.productCategory)} />
        <Row label="Species" value={labelOf(LUMBER_SPECIES_OPTIONS, spec.species)} />
        <Row label="Grade" value={spec.grade ?? null} />
        <Row label="Dryness" value={labelOf(LUMBER_DRYNESS_OPTIONS, spec.dryness)} />
        <Row label="Moisture %" value={typeof spec.moistureContentPct === "number" ? `${spec.moistureContentPct}%` : null} />
        <Row label="Treatment" value={labelOf(LUMBER_TREATMENT_OPTIONS, spec.treatment)} />
        <Row label="Certifications" value={certs} />
        <Row label="Nominal size" value={spec.nominalSize ?? null} />
        <Row label="Dimension" value={dimension} />
        <Row label="Length(s)" value={lengths} />
        <Row label="Panel type" value={labelOf(LUMBER_PANEL_TYPE_OPTIONS, spec.panelType)} />
        <Row label="Panel grade" value={spec.panelGrade ?? null} />
        <Row label="Panel size" value={spec.panelSize ?? null} />
        <Row label="Edge profile" value={labelOf(LUMBER_EDGE_PROFILE_OPTIONS, spec.edgeProfile)} />
        <Row label="Packaging" value={labelOf(LUMBER_PACKAGING_OPTIONS, spec.packaging)} />
        <Row label="Loading" value={labelOf(LUMBER_LOADING_METHOD_OPTIONS, spec.loadingMethod)} />
        <Row label="Bundles" value={typeof spec.bundleCount === "number" ? spec.bundleCount.toLocaleString() : null} />
        <Row label="Pieces" value={typeof spec.pieceCount === "number" ? spec.pieceCount.toLocaleString() : null} />
        <Row label="Board feet" value={typeof spec.boardFeet === "number" ? spec.boardFeet.toLocaleString() : null} />
        <Row label="MBF" value={typeof spec.mbf === "number" ? spec.mbf.toLocaleString() : null} />
      </dl>

      <div className="mt-3 flex flex-wrap gap-2">
        {spec.millTallyRequired && (
          <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900 ring-1 ring-amber-300">
            Mill tally required
          </span>
        )}
        {spec.fragile && (
          <span className="inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-semibold text-orange-900 ring-1 ring-orange-300">
            Fragile
          </span>
        )}
        {spec.weatherSensitive && (
          <span className="inline-flex items-center rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-900 ring-1 ring-sky-300">
            Weather-sensitive (tarp)
          </span>
        )}
        {spec.exportShipment && (
          <span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-900 ring-1 ring-indigo-300">
            Export shipment
          </span>
        )}
      </div>

      {spec.notes && (
        <p className="mt-3 whitespace-pre-wrap text-sm text-zinc-700">{spec.notes}</p>
      )}
    </section>
  );
}
