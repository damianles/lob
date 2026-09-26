import { extractLoadExecution, streetLineFromStoredAddress, type LoadStopDetail } from "@/lib/load-execution";

type LanePlace = { city: string; state: string; zip: string };

function ChipList({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <ul className="mt-1.5 flex flex-wrap gap-1.5">
      {items.map((t) => (
        <li key={t} className="rounded-md bg-stone-50 px-2 py-0.5 text-sm font-normal text-stone-600 ring-1 ring-stone-200/80">
          {t}
        </li>
      ))}
    </ul>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-stone-900">{children}</h3>
  );
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-bold uppercase tracking-wide text-stone-900">{label}</dt>
      <dd className="mt-1 text-[15px] font-normal leading-snug text-stone-500">{value}</dd>
    </div>
  );
}

function cityStateLine(city: string | null | undefined, state: string | null | undefined): string {
  return [city?.trim(), state?.trim()].filter(Boolean).join(", ");
}

function StopCard({
  stop,
  fallback,
}: {
  stop: LoadStopDetail;
  fallback?: LanePlace;
}) {
  const street = streetLineFromStoredAddress(stop.address, stop.postal || fallback?.zip);
  const cityState =
    cityStateLine(stop.city, stop.state) ||
    (stop.index === 1 && fallback ? cityStateLine(fallback.city, fallback.state) : "");
  const postal = stop.postal || (stop.index === 1 ? fallback?.zip : "") || "";

  return (
    <div className="rounded-lg border border-stone-200 bg-stone-50/80 px-3 py-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-stone-800">Location {stop.index}</p>
      <dl className="mt-2 grid gap-2 sm:grid-cols-2">
        <Fact label="Company name" value={stop.companyName} />
        <Fact label="Street address" value={street} />
        <Fact label="City / province or state" value={cityState} />
        <Fact label="Postal / ZIP code" value={postal} />
        <div className="sm:col-span-2">
          <Fact label="Contact phone number" value={stop.phone} />
        </div>
        <Fact label="Date" value={stop.date} />
        <Fact label="Time / notes" value={stop.time} />
        <Fact label="Window" value={stop.window} />
        <Fact label="Appointment" value={stop.appointment} />
      </dl>
    </div>
  );
}

/**
 * Human-readable view of Load.extendedPosting for suppliers / booked carriers.
 */
export function ExtendedPostingPanel({
  data,
  className,
  origin,
  destination,
}: {
  data: unknown;
  className?: string;
  origin?: LanePlace;
  destination?: LanePlace;
}) {
  const execution = extractLoadExecution(data);
  const ext =
    data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, unknown>) : null;
  if (!ext) return null;

  const req = ext.loadRequirements && typeof ext.loadRequirements === "object" ? (ext.loadRequirements as Record<string, unknown>) : null;
  const reqChips = [
    req?.straps === true || ext.securement === "Straps" ? "Straps" : null,
    req?.tarp === true || ext.cleaning === "Tarp" ? "Tarp" : null,
    req?.chains === true || ext.securement === "Chains" ? "Chains" : null,
    req?.wash === true || ext.cleaning === "Wash" ? "Wash" : null,
  ].filter(Boolean) as string[];

  const permits = ext.permits && typeof ext.permits === "object" ? (ext.permits as Record<string, unknown>) : null;
  const permitNote = typeof permits?.note === "string" && permits.note.trim() ? permits.note.trim() : null;

  const pu = ext.pickupServices && typeof ext.pickupServices === "object" ? (ext.pickupServices as Record<string, unknown>) : null;
  const del = ext.deliveryServices && typeof ext.deliveryServices === "object" ? (ext.deliveryServices as Record<string, unknown>) : null;
  const serviceChips = [
    pu?.appointment === true ? "Pickup appointment" : null,
    pu?.driverAssist === true ? "Pickup driver assist" : null,
    pu?.callBefore === true ? "Pickup call before" : null,
    del?.appointment === true ? "Delivery appointment" : null,
    del?.driverAssist === true ? "Delivery driver assist" : null,
    del?.callBefore === true ? "Delivery call before" : null,
  ].filter(Boolean) as string[];

  const ppe = ext.ppe && typeof ext.ppe === "object" ? (ext.ppe as Record<string, unknown>) : null;
  const ppeChips = [
    ppe?.vest === true ? "Safety vest" : null,
    ppe?.steelToes === true ? "Steel toes" : null,
    ppe?.hardHat === true ? "Hard hat" : null,
    ppe?.safetyGlasses === true ? "Safety glasses" : null,
    typeof ppe?.other === "string" && ppe.other.trim() ? ppe.other.trim() : null,
  ].filter(Boolean) as string[];

  const cross = ext.crossBorder && typeof ext.crossBorder === "object" ? (ext.crossBorder as Record<string, unknown>) : null;
  const borderBits = cross
    ? [
        cross.papsRequired === true
          ? `PAPS${typeof cross.papsNumber === "string" && cross.papsNumber.trim() ? `: ${cross.papsNumber.trim()}` : ""}`
          : null,
        cross.parsRequired === true
          ? `PARS / ECI / CCM${typeof cross.parsNumber === "string" && cross.parsNumber.trim() ? `: ${cross.parsNumber.trim()}` : ""}`
          : null,
      ].filter(Boolean) as string[]
    : [];

  const equipmentDetail = typeof ext.equipmentDetail === "string" && ext.equipmentDetail.trim() ? ext.equipmentDetail.trim() : null;
  const tenderUrl = typeof ext.tenderUrl === "string" && ext.tenderUrl.trim() ? ext.tenderUrl.trim() : null;

  const refs = [
    { label: "Ship ref", value: execution.shipRef },
    { label: "Customer order", value: execution.customerOrderNo },
    { label: "PO", value: execution.poNumber },
    { label: "Customer", value: execution.customerName },
  ].filter((r) => r.value);

  const hasAnything =
    refs.length ||
    reqChips.length ||
    permitNote ||
    serviceChips.length ||
    ppeChips.length ||
    borderBits.length ||
    execution.notes ||
    equipmentDetail ||
    execution.pickupNotes ||
    execution.deliveryNotes ||
    execution.ftlLtl ||
    tenderUrl ||
    execution.pickups.length ||
    execution.deliveries.length;

  if (!hasAnything) return null;

  return (
    <section className={`rounded-lg border border-stone-200 bg-white p-4 sm:p-5 ${className ?? ""}`}>
      <h2 className="text-base font-bold text-stone-900">Post details</h2>
      <p className="mt-0.5 text-xs text-stone-600">Everything captured when this load was posted.</p>

      <div className="mt-4 space-y-5">
        {(execution.ftlLtl || equipmentDetail) && (
          <div>
            <SectionLabel>Mode</SectionLabel>
            <dl className="mt-2 grid gap-3 sm:grid-cols-2">
              <Fact label="FTL / LTL" value={execution.ftlLtl} />
              <Fact label="Specialized equipment" value={equipmentDetail} />
            </dl>
          </div>
        )}

        {refs.length > 0 && (
          <div>
            <SectionLabel>Reference #&apos;s</SectionLabel>
            <dl className="mt-2 grid gap-3 sm:grid-cols-2">
              {refs.map((r) => (
                <Fact key={r.label} label={r.label} value={r.value} />
              ))}
            </dl>
          </div>
        )}

        {tenderUrl && (
          <div>
            <SectionLabel>Tender / link</SectionLabel>
            <a className="mt-1.5 block break-all text-[15px] font-normal text-stone-500 underline decoration-stone-300 underline-offset-2 hover:text-lob-navy" href={tenderUrl} target="_blank" rel="noreferrer">
              {tenderUrl}
            </a>
          </div>
        )}

        {execution.pickups.length > 0 && (
          <div>
            <SectionLabel>Pick up stops</SectionLabel>
            <div className="mt-2 space-y-2">
              {execution.pickups.map((stop) => (
                <StopCard key={`pu-${stop.index}`} stop={stop} fallback={origin} />
              ))}
            </div>
          </div>
        )}

        {execution.deliveries.length > 0 && (
          <div>
            <SectionLabel>Delivery stops</SectionLabel>
            <div className="mt-2 space-y-2">
              {execution.deliveries.map((stop) => (
                <StopCard key={`del-${stop.index}`} stop={stop} fallback={destination} />
              ))}
            </div>
          </div>
        )}

        {reqChips.length > 0 && (
          <div>
            <SectionLabel>Load requirements</SectionLabel>
            <ChipList items={reqChips} />
          </div>
        )}
        {permitNote && (
          <div>
            <SectionLabel>Permits</SectionLabel>
            <p className="mt-1.5 text-[15px] font-normal text-stone-500">{permitNote}</p>
          </div>
        )}
        {serviceChips.length > 0 && (
          <div>
            <SectionLabel>Services</SectionLabel>
            <ChipList items={serviceChips} />
          </div>
        )}
        {(execution.pickupNotes || execution.deliveryNotes) && (
          <div>
            <SectionLabel>Instructions</SectionLabel>
            <dl className="mt-2 grid gap-3 sm:grid-cols-2">
              <Fact label="Pickup instructions" value={execution.pickupNotes} />
              <Fact label="Delivery instructions" value={execution.deliveryNotes} />
            </dl>
          </div>
        )}
        {ppeChips.length > 0 && (
          <div>
            <SectionLabel>PPE</SectionLabel>
            <ChipList items={ppeChips} />
          </div>
        )}
        {borderBits.length > 0 && (
          <div>
            <SectionLabel>Cross-border</SectionLabel>
            <ChipList items={borderBits} />
          </div>
        )}
        {execution.notes && (
          <div>
            <SectionLabel>Notes</SectionLabel>
            <p className="mt-1.5 whitespace-pre-wrap text-[15px] font-normal leading-relaxed text-stone-500">{execution.notes}</p>
          </div>
        )}
      </div>
    </section>
  );
}
