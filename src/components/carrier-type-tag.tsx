import { cn } from "@/lib/cn";

type CarrierTypeTagProps = {
  carrierType?: "ASSET_BASED" | "BROKER" | null;
  isOwnerOperator?: boolean | null;
  className?: string;
  /** Show short text only ("ASSET" / "BROKER" / "OWNER-OP"). */
  compact?: boolean;
};

/**
 * Visual tag that tells a shipper at a glance whether a carrier company is
 * asset-based, a broker (re-tenders to a third party), or an owner-operator.
 *
 * Owner-op flag wins visually because that is the most differentiated case
 * (single-truck operator). Asset vs Broker is the next signal.
 */
export function CarrierTypeTag({
  carrierType,
  isOwnerOperator,
  className,
  compact = false,
}: CarrierTypeTagProps) {
  if (isOwnerOperator) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-700 ring-1 ring-slate-300",
          className,
        )}
        title="Owner-operator: independent driver running their own truck"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-slate-500" aria-hidden />
        {compact ? "Owner-op" : "Owner-operator"}
      </span>
    );
  }

  if (carrierType === "BROKER") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-900 ring-1 ring-amber-300",
          className,
        )}
        title="Broker: arranges transport via a third-party asset carrier"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden />
        Broker
      </span>
    );
  }

  if (carrierType === "ASSET_BASED") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-900 ring-1 ring-emerald-300",
          className,
        )}
        title="Asset-based: runs their own trucks/trailers"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
        {compact ? "Asset" : "Asset-based"}
      </span>
    );
  }

  return null;
}
