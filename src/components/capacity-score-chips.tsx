import type { CapacityScoreBand, CapacityScorecardPublic } from "@/lib/capacity-scorecard-shared";
import { formatRespondHours } from "@/lib/capacity-scorecard-shared";

function bandStyles(band: CapacityScoreBand) {
  switch (band) {
    case "excellent":
      return "bg-emerald-50 text-emerald-900 ring-emerald-200";
    case "good":
      return "bg-sky-50 text-sky-900 ring-sky-200";
    case "caution":
      return "bg-amber-50 text-amber-950 ring-amber-200";
    default:
      return "bg-stone-50 text-stone-600 ring-stone-200";
  }
}

function bandLabel(band: CapacityScoreBand) {
  switch (band) {
    case "excellent":
      return "Strong";
    case "good":
      return "Solid";
    case "caution":
      return "Mixed";
    default:
      return "New";
  }
}

/**
 * Compact anonymous capacity performance chips (no carrier identity).
 */
export function CapacityScoreChips({
  score,
  className,
}: {
  score: CapacityScorecardPublic | null | undefined;
  className?: string;
}) {
  if (!score) return null;

  const respond = formatRespondHours(score.medianRespondHours);
  const title = [
    score.sampleSize > 0
      ? `${score.sampleSize} capacity decisions in the last 90 days`
      : "No capacity decisions yet",
    score.acceptRatePct != null ? `Accept rate ${score.acceptRatePct}%` : null,
    respond ? `Median respond ${respond}` : null,
    score.completionRatePct != null
      ? `Completion ${score.completionRatePct}% (${score.completionSampleSize} finished)`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className={`flex flex-wrap items-center gap-1 ${className ?? ""}`} title={title}>
      <span
        className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ring-1 ${bandStyles(score.band)}`}
      >
        {bandLabel(score.band)}
        {score.acceptRatePct != null ? ` · ${score.acceptRatePct}% accept` : ""}
      </span>
      {respond ? (
        <span className="inline-flex items-center rounded-full bg-stone-50 px-1.5 py-0.5 text-[10px] font-medium text-stone-700 ring-1 ring-stone-200">
          ~{respond} reply
        </span>
      ) : null}
      {score.completionRatePct != null ? (
        <span className="inline-flex items-center rounded-full bg-stone-50 px-1.5 py-0.5 text-[10px] font-medium text-stone-700 ring-1 ring-stone-200">
          {score.completionRatePct}% finish
        </span>
      ) : null}
    </div>
  );
}
