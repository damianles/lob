import { cn } from "@/lib/cn";
import { displayLoadStatus } from "@/lib/load-status-label";

/** Shared load-status pill: single line, optically centered, same box on every surface. */
const PILL_BASE =
  "inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-full px-2.5 py-1 text-center text-[11px] font-semibold leading-none tracking-tight ring-1 ring-inset";

function statusTone(status: string): string {
  switch (status) {
    case "POSTED":
      return "bg-stone-100 text-stone-800 ring-stone-300/80";
    case "BOOKED":
    case "ASSIGNED":
      return "bg-blue-50 text-blue-950 ring-blue-200";
    case "IN_TRANSIT":
      return "bg-amber-50 text-amber-950 ring-amber-200";
    case "DELIVERED":
      return "bg-emerald-50 text-emerald-950 ring-emerald-200";
    case "CANCELLED":
      return "bg-rose-50 text-rose-950 ring-rose-200";
    case "NEEDS_REPOST":
      return "lob-needs-repost-badge bg-amber-100 text-amber-950 ring-amber-300";
    case "UNLISTED":
      return "bg-stone-100 text-stone-600 ring-stone-300/80";
    default:
      return "bg-stone-100 text-stone-700 ring-stone-300/80";
  }
}

export function LoadStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  return (
    <span className={cn(PILL_BASE, statusTone(status), className)}>
      {displayLoadStatus(status)}
    </span>
  );
}
