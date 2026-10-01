import type { ReactNode } from "react";
import { LoadStatus } from "@prisma/client";

import { LoadStatusBadge } from "@/components/load-status-badge";
import { cn } from "@/lib/cn";
import { LOB_PILL } from "@/lib/lob-pill";

export type BadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "error"
  | "info"
  | "rush"
  | "posted"
  | "booked"
  | "assigned"
  | "in-transit"
  | "delivered";

export interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
  pulse?: boolean;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-stone-100 text-stone-700 ring-stone-300/80",
  success: "bg-emerald-100 text-emerald-900 ring-emerald-200",
  warning: "bg-amber-100 text-amber-950 ring-amber-300",
  error: "bg-red-100 text-red-900 ring-red-200",
  info: "bg-blue-100 text-blue-900 ring-blue-200",
  rush: "bg-gradient-to-r from-amber-100 to-orange-100 text-orange-950 ring-orange-300",
  posted: "bg-lob-paper text-lob-navy ring-stone-300/80",
  booked: "bg-indigo-100 text-indigo-950 ring-indigo-200",
  assigned: "bg-purple-100 text-purple-950 ring-purple-200",
  "in-transit": "bg-green-100 text-green-950 ring-green-300",
  delivered: "bg-emerald-100 text-emerald-950 ring-emerald-300",
};

/** Generic chip. Prefer `LoadStatusBadge` / `StatusBadge` for load lifecycle. */
export function Badge({ children, variant = "default", className = "", pulse = false }: BadgeProps) {
  return (
    <span
      className={cn(
        "relative gap-1.5 text-xs",
        LOB_PILL,
        variantClasses[variant],
        className,
      )}
    >
      {pulse && (
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
        </span>
      )}
      {children}
    </span>
  );
}

export function getStatusBadgeVariant(status: LoadStatus): BadgeVariant {
  const statusMap: Record<LoadStatus, BadgeVariant> = {
    POSTED: "posted",
    BOOKED: "booked",
    ASSIGNED: "booked",
    IN_TRANSIT: "in-transit",
    DELIVERED: "delivered",
    CANCELLED: "error",
    NEEDS_REPOST: "warning",
    UNLISTED: "default",
  };
  return statusMap[status] || "default";
}

export function StatusBadge({ status, className }: { status: LoadStatus | string; className?: string }) {
  return <LoadStatusBadge status={status} className={className} />;
}
