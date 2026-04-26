import { CarrierTypeTag } from "@/components/carrier-type-tag";

type DocSummary = { kind: string; expiresAt: Date | null };

type Props = {
  carrier: {
    legalName: string;
    dotNumber: string | null;
    mcNumber: string | null;
    carrierType: "ASSET_BASED" | "BROKER" | null;
    isOwnerOperator: boolean;
    fleetTruckCount: number | null;
    fleetTrailerCount: number | null;
    trailerEquipmentTypes: string | null;
    carrierProfileBlurb: string | null;
    factoringEligible: boolean;
    verificationStatus: "PENDING" | "APPROVED" | "REJECTED";
    reliabilityScore?: number | null;
  };
  documents?: DocSummary[];
  className?: string;
};

function parseTrailers(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function reliabilityChip(score: number | null | undefined) {
  if (score == null) return null;
  let cls = "bg-stone-100 text-stone-700 ring-stone-200";
  let label = "Unrated";
  if (score >= 90) {
    cls = "bg-emerald-50 text-emerald-900 ring-emerald-200";
    label = "Excellent";
  } else if (score >= 75) {
    cls = "bg-emerald-50 text-emerald-800 ring-emerald-200";
    label = "Reliable";
  } else if (score >= 60) {
    cls = "bg-amber-50 text-amber-900 ring-amber-200";
    label = "Caution";
  } else {
    cls = "bg-rose-50 text-rose-900 ring-rose-200";
    label = "At-risk";
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${cls}`}>
      <span className="font-mono">{score}</span> · {label}
    </span>
  );
}

/**
 * Compact, decision-grade view of a carrier shown to the shipper at the
 * booking moment. Combines verification, business type, fleet, profile,
 * and any document expiries so the shipper can say yes/no without
 * leaving the load detail page.
 */
export function CarrierScorecard({ carrier, documents = [], className }: Props) {
  const trailers = parseTrailers(carrier.trailerEquipmentTypes);
  const isBroker = carrier.carrierType === "BROKER";

  return (
    <section
      className={`overflow-hidden rounded-lg border border-zinc-200 bg-white text-sm shadow-sm ${className ?? ""}`}
    >
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 bg-zinc-50/60 px-4 py-3">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-zinc-900">{carrier.legalName}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-zinc-600">
            <CarrierTypeTag carrierType={carrier.carrierType} isOwnerOperator={carrier.isOwnerOperator} />
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${
                carrier.verificationStatus === "APPROVED"
                  ? "bg-emerald-50 text-emerald-900 ring-emerald-200"
                  : carrier.verificationStatus === "PENDING"
                    ? "bg-amber-50 text-amber-900 ring-amber-200"
                    : "bg-rose-50 text-rose-900 ring-rose-200"
              }`}
            >
              {carrier.verificationStatus === "APPROVED" ? "✓ Verified" : carrier.verificationStatus}
            </span>
            {reliabilityChip(carrier.reliabilityScore ?? null)}
            {carrier.factoringEligible && (
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-900 ring-1 ring-indigo-200">
                Factoring
              </span>
            )}
          </div>
        </div>
        {isBroker && (
          <p className="max-w-[18rem] rounded-md bg-amber-50 px-2.5 py-1.5 text-[11px] leading-snug text-amber-900 ring-1 ring-amber-200">
            <span className="font-semibold">Heads up:</span> brokers re-tender to a 3rd-party asset carrier — confirm
            the actual driver before pickup.
          </p>
        )}
      </header>

      <dl className="grid gap-3 px-4 py-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">DOT / MC</dt>
          <dd className="mt-0.5 font-mono text-[13px]">
            {carrier.dotNumber ?? "—"} / {carrier.mcNumber ?? "—"}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Fleet</dt>
          <dd className="mt-0.5 text-[13px]">
            {carrier.fleetTruckCount ?? "—"} trucks · {carrier.fleetTrailerCount ?? "—"} trailers
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Equipment</dt>
          <dd className="mt-0.5 flex flex-wrap gap-1 text-[12px]">
            {trailers.length === 0 && <span className="text-zinc-400">Not declared</span>}
            {trailers.map((t) => (
              <span
                key={t}
                className="inline-flex items-center rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-700 ring-1 ring-stone-200"
              >
                {t}
              </span>
            ))}
          </dd>
        </div>
      </dl>

      {carrier.carrierProfileBlurb && (
        <div className="border-t border-zinc-100 bg-zinc-50/40 px-4 py-3 text-[12px] leading-relaxed text-zinc-700">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Carrier note</p>
          <p className="mt-1 whitespace-pre-wrap">{carrier.carrierProfileBlurb}</p>
        </div>
      )}

      {documents.length > 0 && (
        <div className="border-t border-zinc-100 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Documents on file</p>
          <ul className="mt-1 grid gap-1 text-[12px] text-zinc-700 sm:grid-cols-2">
            {documents.map((d, i) => {
              const expSoon =
                d.expiresAt && d.expiresAt.getTime() - Date.now() < 30 * 86400000;
              return (
                <li
                  key={`${d.kind}-${i}-${d.expiresAt?.toISOString() ?? ""}`}
                  className="flex items-center gap-1.5"
                >
                  <span
                    className={`inline-block h-1.5 w-1.5 rounded-full ${
                      d.expiresAt
                        ? expSoon
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                        : "bg-stone-400"
                    }`}
                  />
                  <span className="font-medium">{d.kind}</span>
                  {d.expiresAt ? (
                    <span className={expSoon ? "text-amber-800" : "text-zinc-500"}>
                      · expires {d.expiresAt.toLocaleDateString()}
                    </span>
                  ) : (
                    <span className="text-zinc-400">· no expiry</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
