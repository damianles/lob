import { rateModeHint, rateModeLabel, type LoadRateMode } from "@/lib/rate-mode";

export function RateModeBadge({
  rateMode,
  allowCounterOffers,
  compact = false,
}: {
  rateMode: LoadRateMode | string;
  allowCounterOffers?: boolean;
  compact?: boolean;
}) {
  const mode = rateMode === "OPEN_BID" ? "OPEN_BID" : "TAKE_IT";
  const counters = Boolean(allowCounterOffers) && mode === "TAKE_IT";
  const label = rateModeLabel(mode);

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ${
        mode === "OPEN_BID"
          ? "bg-violet-50 text-violet-900 ring-violet-200"
          : counters
            ? "bg-amber-50 text-amber-950 ring-amber-200"
            : "bg-emerald-50 text-emerald-900 ring-emerald-200"
      }`}
      title={rateModeHint(mode, counters)}
    >
      {label}
      {!compact && counters ? <span className="font-medium normal-case tracking-normal">· counters</span> : null}
    </span>
  );
}
