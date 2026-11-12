import { CarrierTypeTag } from "@/components/carrier-type-tag";
import { CREDIT_FILE_LABELS, type CreditFileKind } from "@/lib/credit-file";
import {
  CARRIER_PERF_MIN_SAMPLE,
  formatCoverageUsd,
  type CarrierPerformanceStats,
} from "@/lib/carrier-performance";
import { formatDisplayDate } from "@/lib/format-display-date";
import { LOB_PILL_COMPACT } from "@/lib/lob-pill";

export type ScorecardDocChip = {
  kind: string;
  label: string;
  /** present | missing */
  status: "on_file" | "missing";
  expiresAt?: string | null;
  /** For INSURANCE: current | expiring | expired | unknown */
  insuranceState?: "current" | "expiring" | "expired" | "unknown";
};

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
    verificationStatus: "PENDING" | "APPROVED" | "REJECTED";
    reliabilityScore?: number | null;
  };
  /** Compliance passport — status only, no file URLs. */
  passport?: ScorecardDocChip[];
  insurance?: {
    current: boolean;
    expiringSoon: boolean;
    expiresAt: string | null;
    cargoCoverageUsd: number | null;
    autoLiabilityCoverageUsd: number | null;
    /** Admin confirmed entered limits match the COI file. */
    coverageVerified: boolean;
  } | null;
  performance?: CarrierPerformanceStats | null;
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
    <span className={`${LOB_PILL_COMPACT} gap-1 text-[11px] ${cls}`}>
      <span className="font-mono">{score}</span> · {label}
    </span>
  );
}

function rateCell(label: string, value: string, hint?: string) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd className="mt-0.5 text-[13px] font-semibold tabular-nums text-zinc-900">{value}</dd>
      {hint ? <p className="mt-0.5 text-[10px] text-zinc-500">{hint}</p> : null}
    </div>
  );
}

function formatPct(pct: number | null, sample: number): { value: string; hint?: string } {
  if (pct == null) {
    return {
      value: "—",
      hint: sample > 0 ? `${sample} of ${CARRIER_PERF_MIN_SAMPLE}+ needed` : `Need ${CARRIER_PERF_MIN_SAMPLE}+ loads`,
    };
  }
  return { value: `${pct}%`, hint: `n=${sample}` };
}

/**
 * Decision-grade carrier view for the shipper after booking.
 * Compliance passport (no file dumps), coverage limits, and LOB check-in KPIs.
 */
export function CarrierScorecard({
  carrier,
  passport = [],
  insurance = null,
  performance = null,
  className,
}: Props) {
  const trailers = parseTrailers(carrier.trailerEquipmentTypes);
  const isBroker = carrier.carrierType === "BROKER";
  const pickup = performance
    ? formatPct(performance.onTimePickupPct, performance.onTimePickupSample)
    : { value: "—" };
  const deliveryOt = performance
    ? formatPct(performance.onTimeDeliveryPct, performance.onTimeDeliverySample)
    : { value: "—" };

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
              className={`${LOB_PILL_COMPACT} gap-1 text-[11px] ${
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
          </div>
        </div>
        {isBroker && (
          <p className="max-w-[18rem] rounded-md bg-amber-50 px-2.5 py-1.5 text-[11px] leading-snug text-amber-900 ring-1 ring-amber-200">
            <span className="font-semibold">Heads up:</span> brokers re-tender to a 3rd-party asset carrier — confirm
            the actual driver before pickup.
          </p>
        )}
      </header>

      <dl className="grid gap-3 border-b border-zinc-100 px-4 py-3 sm:grid-cols-2 lg:grid-cols-4">
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
                className={`${LOB_PILL_COMPACT} bg-stone-100 text-[11px] font-medium text-stone-700 ring-stone-200`}
              >
                {t}
              </span>
            ))}
          </dd>
        </div>
      </dl>

      {insurance ? (
        <dl className="grid gap-3 border-b border-zinc-100 bg-sky-50/40 px-4 py-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Cargo coverage</dt>
            <dd className="mt-0.5 text-[15px] font-semibold tabular-nums text-zinc-900">
              {formatCoverageUsd(insurance.cargoCoverageUsd)}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Auto liability</dt>
            <dd className="mt-0.5 text-[15px] font-semibold tabular-nums text-zinc-900">
              {formatCoverageUsd(insurance.autoLiabilityCoverageUsd)}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">COI status</dt>
            <dd className="mt-0.5 text-[13px] font-medium">
              {!insurance.expiresAt ? (
                <span className="text-rose-800">Not on file</span>
              ) : !insurance.current ? (
                <span className="text-rose-800">Expired</span>
              ) : insurance.expiringSoon ? (
                <span className="text-amber-900">Expiring soon</span>
              ) : (
                <span className="text-emerald-800">Current</span>
              )}
            </dd>
            {insurance.expiresAt ? (
              <p className="mt-0.5 text-[10px] text-zinc-500">
                Through {formatDisplayDate(insurance.expiresAt)}
              </p>
            ) : null}
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Limits review</dt>
            <dd className="mt-0.5 text-[12px]">
              {insurance.coverageVerified ? (
                <span className="font-medium text-emerald-800">LOB confirmed vs COI</span>
              ) : (
                <span className="font-medium text-amber-900">Carrier-reported · pending LOB review</span>
              )}
            </dd>
            <p className="mt-0.5 text-[10px] text-zinc-500">
              {insurance.coverageVerified
                ? "Admin opened the certificate and matched these amounts."
                : "Amounts are what the carrier typed; not yet matched to the file."}
            </p>
          </div>
        </dl>
      ) : null}

      {performance ? (
        <dl className="grid gap-3 border-b border-zinc-100 px-4 py-3 sm:grid-cols-3 lg:grid-cols-5">
          {rateCell("Loads booked", String(performance.bookedCount), "All-time on LOB")}
          {rateCell("Delivered", String(performance.deliveredCount), "Complete on LOB")}
          {rateCell(
            "Delivery rate",
            performance.deliveryRatePct != null ? `${performance.deliveryRatePct}%` : "—",
            performance.deliveryRatePct == null
              ? `Need ${CARRIER_PERF_MIN_SAMPLE}+ booked`
              : `n=${performance.bookedCount}`,
          )}
          {rateCell("On-time pickup", pickup.value, `${pickup.hint ?? ""} · check-in day`)}
          {rateCell("On-time delivery", deliveryOt.value, `${deliveryOt.hint ?? ""} · check-in day`)}
        </dl>
      ) : null}

      {passport.length > 0 && (
        <div className="border-b border-zinc-100 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            Compliance passport
          </p>
          <p className="mt-0.5 text-[11px] text-zinc-500">
            Status only — document files are not exposed here.
          </p>
          <ul className="mt-2 grid gap-1.5 text-[12px] text-zinc-700 sm:grid-cols-2">
            {passport.map((d) => {
              const ok = d.status === "on_file";
              const insBad =
                d.kind === "INSURANCE" &&
                (d.insuranceState === "expired" || d.insuranceState === "unknown");
              const insWarn = d.kind === "INSURANCE" && d.insuranceState === "expiring";
              return (
                <li key={d.kind} className="flex items-center gap-1.5">
                  <span
                    className={`inline-block h-1.5 w-1.5 rounded-full ${
                      !ok || insBad ? "bg-rose-500" : insWarn ? "bg-amber-500" : "bg-emerald-500"
                    }`}
                  />
                  <span className="font-medium">{d.label}</span>
                  <span className="text-zinc-500">
                    ·{" "}
                    {!ok
                      ? "missing"
                      : d.kind === "INSURANCE" && d.insuranceState === "expired"
                        ? "expired"
                        : d.kind === "INSURANCE" && d.insuranceState === "expiring"
                          ? "expiring"
                          : d.expiresAt
                            ? `on file · ${formatDisplayDate(d.expiresAt)}`
                            : "on file"}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {carrier.carrierProfileBlurb && (
        <div className="bg-zinc-50/40 px-4 py-3 text-[12px] leading-relaxed text-zinc-700">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Carrier note</p>
          <p className="mt-1 whitespace-pre-wrap">{carrier.carrierProfileBlurb}</p>
        </div>
      )}
    </section>
  );
}

const PASSPORT_KINDS: CreditFileKind[] = ["W9", "BUSINESS_REGISTRATION", "CREDIT_REFERENCE", "INSURANCE"];

/** Build passport chips from latest-per-kind docs + insurance status. */
export function buildCompliancePassport(args: {
  docs: { kind: string; expiresAt: Date | null }[];
  insurance: {
    documentId: string | null;
    current: boolean;
    expiringSoon: boolean;
    expiresAt: Date | null;
  } | null;
  authorityRegion?: string | null;
}): ScorecardDocChip[] {
  const latestByKind = new Map<string, { expiresAt: Date | null }>();
  for (const d of args.docs) {
    if (!latestByKind.has(d.kind)) latestByKind.set(d.kind, { expiresAt: d.expiresAt });
  }

  const region = args.authorityRegion ?? "US";
  const wantW9 = region === "US" || region === "BOTH";
  const wantCa = region === "CA" || region === "BOTH";

  const chips: ScorecardDocChip[] = [];
  for (const kind of PASSPORT_KINDS) {
    if (kind === "W9" && !wantW9) continue;
    if (kind === "BUSINESS_REGISTRATION" && !wantCa) continue;
    const row = latestByKind.get(kind);
    const onFile =
      kind === "INSURANCE" ? Boolean(args.insurance?.documentId || row) : Boolean(row);
    let insuranceState: ScorecardDocChip["insuranceState"];
    if (kind === "INSURANCE") {
      if (!args.insurance?.expiresAt) insuranceState = "unknown";
      else if (!args.insurance.current) insuranceState = "expired";
      else if (args.insurance.expiringSoon) insuranceState = "expiring";
      else insuranceState = "current";
    }
    chips.push({
      kind,
      label: CREDIT_FILE_LABELS[kind],
      status: onFile ? "on_file" : "missing",
      expiresAt:
        kind === "INSURANCE"
          ? (args.insurance?.expiresAt?.toISOString() ?? null)
          : (row?.expiresAt?.toISOString() ?? null),
      insuranceState,
    });
  }
  return chips;
}
