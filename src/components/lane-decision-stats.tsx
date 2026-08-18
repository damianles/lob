import type { LaneDecisionContext } from "@/lib/lane-decision-types";
import { formatMoney } from "@/lib/money";

function matchLabel(level: LaneDecisionContext["matchLevel"]) {
  if (level === "zip") return "zip";
  if (level === "city") return "city";
  if (level === "state") return "state/province";
  return null;
}

function rpm(amount: number | null, miles: number | null, currency: "USD" | "CAD") {
  if (amount == null || miles == null || miles <= 0) return null;
  return `${formatMoney(amount / miles, currency)}/mi`;
}

export function LaneDecisionStats({
  ctx,
  compact = false,
}: {
  ctx: LaneDecisionContext;
  compact?: boolean;
}) {
  const ccy = ctx.currency;
  const grain = matchLabel(ctx.matchLevel);
  const avgRpm = rpm(ctx.marketAvg, ctx.miles, ccy);
  const lastRpm = rpm(ctx.lastBookedRate, ctx.miles, ccy);

  return (
    <div
      className={`rounded-lg border border-stone-200 bg-white ${compact ? "px-3 py-2" : "px-3 py-3"}`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Lane context</p>
      <dl className="mt-1.5 grid gap-x-4 gap-y-1 text-[11px] text-zinc-700 sm:grid-cols-2">
        <div>
          <dt className="text-zinc-500">Market avg{grain ? ` (${grain})` : ""}</dt>
          <dd className="font-semibold tabular-nums text-zinc-900">
            {ctx.marketAvg != null ? formatMoney(ctx.marketAvg, ccy) : "Not enough data yet"}
            {avgRpm ? <span className="ml-1 font-normal text-zinc-500">{avgRpm}</span> : null}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Your last book on this lane</dt>
          <dd className="font-semibold tabular-nums text-zinc-900">
            {ctx.lastBookedRate != null ? formatMoney(ctx.lastBookedRate, ccy) : "None yet"}
            {lastRpm ? <span className="ml-1 font-normal text-zinc-500">{lastRpm}</span> : null}
            {ctx.priorLaneBookings > 1 ? (
              <span className="ml-1 font-normal text-zinc-500">· {ctx.priorLaneBookings} moves</span>
            ) : null}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Allowed bid/post range</dt>
          <dd className="tabular-nums">
            {ctx.bandEnforced && ctx.floor != null && ctx.ceiling != null ? (
              <>
                {formatMoney(ctx.floor, ccy)} – {formatMoney(ctx.ceiling, ccy)}
                {ctx.thinLane ? (
                  <span className="ml-1 text-amber-800">(wider band — thin lane)</span>
                ) : null}
              </>
            ) : (
              <span className="text-zinc-500">No stop-gap yet — too few lumber moves on this lane</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Distance</dt>
          <dd className="tabular-nums">
            {ctx.miles != null ? (
              <>
                {Math.round(ctx.miles)} mi
                <span className="ml-1 font-normal text-zinc-500">approx</span>
              </>
            ) : (
              "—"
            )}
            {ctx.sampleCount != null ? (
              <span className="ml-1 text-zinc-500">
                · {ctx.sampleCount} sample{ctx.sampleCount === 1 ? "" : "s"} / {ctx.windowDays}d
              </span>
            ) : null}
          </dd>
        </div>
      </dl>
    </div>
  );
}
