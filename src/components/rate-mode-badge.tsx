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
      className={
        mode === "OPEN_BID"
          ? "inline-flex items-center justify-center whitespace-nowrap rounded-full bg-amber-50 px-2.5 py-1 text-center text-[11px] font-semibold leading-none text-amber-950 ring-1 ring-inset ring-amber-200"
          : counters
            ? "inline-flex items-center justify-center whitespace-nowrap rounded-full bg-white px-2.5 py-1 text-center text-[11px] font-semibold leading-none text-lob-navy ring-1 ring-inset ring-lob-gold/50"
            : "inline-flex items-center justify-center whitespace-nowrap rounded-full bg-stone-100 px-2.5 py-1 text-center text-[11px] font-semibold leading-none text-lob-navy ring-1 ring-inset ring-stone-200"
      }
      title={rateModeHint(mode, counters)}
    >
      {label}
      {!compact && counters ? (
        <span className="font-medium"> · counters</span>
      ) : null}
    </span>
  );
}
