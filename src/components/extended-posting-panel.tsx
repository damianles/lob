type Extended = Record<string, unknown>;

function asRecord(v: unknown): Extended | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Extended) : null;
}

function str(v: unknown): string | null {
  if (typeof v === "string" && v.trim()) return v.trim();
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return null;
}

function boolLabel(v: unknown, yes = "Yes"): string | null {
  return v === true ? yes : null;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-zinc-900">{value}</dd>
    </div>
  );
}

function ChipList({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <ul className="mt-1 flex flex-wrap gap-1.5">
      {items.map((t) => (
        <li key={t} className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-800">
          {t}
        </li>
      ))}
    </ul>
  );
}

/**
 * Human-readable view of Load.extendedPosting for suppliers / booked carriers.
 * Replaces the raw JSON dump on the load detail page.
 */
export function ExtendedPostingPanel({
  data,
  className,
}: {
  data: unknown;
  className?: string;
}) {
  const ext = asRecord(data);
  if (!ext) return null;

  const refs = [
    str(ext.shipRef) && `Ship ref: ${str(ext.shipRef)}`,
    str(ext.customerOrderNo) && `Customer order: ${str(ext.customerOrderNo)}`,
    str(ext.poNumber) && `PO: ${str(ext.poNumber)}`,
    str(ext.customerName) && `Customer: ${str(ext.customerName)}`,
  ].filter(Boolean) as string[];

  const req = asRecord(ext.loadRequirements);
  const reqChips = [
    req?.straps === true || ext.securement === "Straps" ? "Straps" : null,
    req?.tarp === true || ext.cleaning === "Tarp" ? "Tarp" : null,
    req?.chains === true || ext.securement === "Chains" ? "Chains" : null,
    req?.wash === true || ext.cleaning === "Wash" ? "Wash" : null,
  ].filter(Boolean) as string[];

  const permits = asRecord(ext.permits);
  const permitNote = permits ? str(permits.note) : null;

  const pu = asRecord(ext.pickupServices);
  const del = asRecord(ext.deliveryServices);
  const serviceChips = [
    boolLabel(pu?.appointment, "PU appointment"),
    boolLabel(pu?.driverAssist, "PU driver assist"),
    boolLabel(pu?.callBefore, "PU call before"),
    boolLabel(del?.appointment, "DEL appointment"),
    boolLabel(del?.driverAssist, "DEL driver assist"),
    boolLabel(del?.callBefore, "DEL call before"),
  ].filter(Boolean) as string[];

  const ppe = asRecord(ext.ppe);
  const ppeChips = [
    boolLabel(ppe?.vest, "Safety vest"),
    boolLabel(ppe?.steelToes, "Steel toes"),
    boolLabel(ppe?.hardHat, "Hard hat"),
    boolLabel(ppe?.safetyGlasses, "Safety glasses"),
    str(ppe?.other),
  ].filter(Boolean) as string[];

  const cross = asRecord(ext.crossBorder);
  const borderBits = cross
    ? [
        cross.papsRequired === true
          ? `PAPS${str(cross.papsNumber) ? `: ${str(cross.papsNumber)}` : ""}`
          : null,
        cross.parsRequired === true
          ? `PARS / ECI / CCM${str(cross.parsNumber) ? `: ${str(cross.parsNumber)}` : ""}`
          : null,
      ].filter(Boolean)
    : [];

  const notes = str(ext.notes);
  const equipmentDetail = str(ext.equipmentDetail);
  const puNotes = req ? str(req.pickupNotes) : null;
  const delNotes = req ? str(req.deliveryNotes) : null;
  const ftlLtl = str(ext.ftlLtl);
  const tenderUrl = str(ext.tenderUrl);

  const pickups = Array.isArray(ext.pickups) ? ext.pickups : [];
  const deliveries = Array.isArray(ext.deliveries) ? ext.deliveries : [];

  function stopLines(raw: unknown, i: number): string | null {
    const r = asRecord(raw);
    if (!r) return null;
    const bits = [str(r.address), str(r.postal), str(r.phone) && `Tel ${str(r.phone)}`].filter(Boolean);
    return bits.length ? `${i + 1}. ${bits.join(" · ")}` : null;
  }

  const pickupLines = pickups.map(stopLines).filter(Boolean) as string[];
  const deliveryLines = deliveries.map(stopLines).filter(Boolean) as string[];

  const hasAnything =
    refs.length ||
    reqChips.length ||
    permitNote ||
    serviceChips.length ||
    ppeChips.length ||
    borderBits.length ||
    notes ||
    equipmentDetail ||
    puNotes ||
    delNotes ||
    ftlLtl ||
    tenderUrl ||
    pickupLines.length ||
    deliveryLines.length;

  if (!hasAnything) return null;

  return (
    <section
      className={`rounded-lg border border-zinc-200 bg-white p-4 ${className ?? ""}`}
    >
      <h2 className="text-sm font-semibold text-zinc-900">Post details</h2>
      <p className="mt-0.5 text-xs text-zinc-500">Requirements and notes from when this load was posted.</p>
      <dl className="mt-3 grid gap-3 sm:grid-cols-2">
        <Row label="Mode" value={ftlLtl} />
        <Row label="Specialized equipment" value={equipmentDetail} />
        <Row
          label="References"
          value={refs.length ? <span className="block space-y-0.5">{refs.map((r) => <span key={r} className="block">{r}</span>)}</span> : null}
        />
        <Row label="Tender / link" value={tenderUrl ? <a className="text-lob-navy underline break-all" href={tenderUrl} target="_blank" rel="noreferrer">{tenderUrl}</a> : null} />
        <Row
          label="Pickup stops"
          value={
            pickupLines.length ? (
              <span className="block space-y-0.5">
                {pickupLines.map((l) => (
                  <span key={l} className="block">
                    {l}
                  </span>
                ))}
              </span>
            ) : null
          }
        />
        <Row
          label="Delivery stops"
          value={
            deliveryLines.length ? (
              <span className="block space-y-0.5">
                {deliveryLines.map((l) => (
                  <span key={l} className="block">
                    {l}
                  </span>
                ))}
              </span>
            ) : null
          }
        />
      </dl>

      {reqChips.length > 0 && (
        <div className="mt-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Load requirements</p>
          <ChipList items={reqChips} />
        </div>
      )}
      {permitNote && (
        <div className="mt-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Permits</p>
          <p className="mt-0.5 text-sm text-zinc-900">{permitNote}</p>
        </div>
      )}
      {serviceChips.length > 0 && (
        <div className="mt-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Services</p>
          <ChipList items={serviceChips} />
        </div>
      )}
      {(puNotes || delNotes) && (
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          <Row label="Pickup instructions" value={puNotes} />
          <Row label="Delivery instructions" value={delNotes} />
        </dl>
      )}
      {ppeChips.length > 0 && (
        <div className="mt-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">PPE</p>
          <ChipList items={ppeChips} />
        </div>
      )}
      {borderBits.length > 0 && (
        <div className="mt-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Cross-border</p>
          <ChipList items={borderBits as string[]} />
        </div>
      )}
      {notes && (
        <div className="mt-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Notes</p>
          <p className="mt-0.5 whitespace-pre-wrap text-sm text-zinc-900">{notes}</p>
        </div>
      )}
    </section>
  );
}
