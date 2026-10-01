import { LOB_PILL } from "@/lib/lob-pill";
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
          ? `${LOB_PILL} bg-amber-50 text-[11px] text-amber-950 ring-amber-200`
          : counters
            ? `${LOB_PILL} bg-white text-[11px] text-lob-navy ring-lob-gold/50`
            : `${LOB_PILL} bg-stone-100 text-[11px] text-lob-navy ring-stone-200`
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
