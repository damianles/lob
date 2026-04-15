import type { ReactNode } from "react";
import { LoadStatus } from "@prisma/client";

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
  default: "bg-stone-100 text-stone-700 ring-1 ring-stone-200",
  success: "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200",
  warning: "bg-amber-100 text-amber-800 ring-1 ring-amber-200",
  error: "bg-red-100 text-red-800 ring-1 ring-red-200",
  info: "bg-blue-100 text-blue-800 ring-1 ring-blue-200",
  rush: "bg-gradient-to-r from-amber-100 to-orange-100 text-orange-900 ring-1 ring-orange-300",
  posted: "bg-lob-paper text-lob-navy ring-1 ring-stone-200",
  booked: "bg-indigo-100 text-indigo-900 ring-1 ring-indigo-200",
  assigned: "bg-purple-100 text-purple-900 ring-1 ring-purple-200",
  "in-transit": "bg-green-100 text-green-900 ring-1 ring-green-300",
  delivered: "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-300",
};

export function Badge({ children, variant = "default", className = "", pulse = false }: BadgeProps) {
  return (
    <span
      className={`
        relative inline-flex items-center gap-1.5
        px-2.5 py-1 rounded-full
        text-xs font-semibold
        ${variantClasses[variant]}
        ${className}
      `}
    >
      {pulse && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-current" />
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
    ASSIGNED: "assigned",
    IN_TRANSIT: "in-transit",
    DELIVERED: "delivered",
    CANCELLED: "error",
  };
  return statusMap[status] || "default";
}

export function StatusBadge({ status, className }: { status: LoadStatus; className?: string }) {
  const variant = getStatusBadgeVariant(status);
  const pulse = status === "IN_TRANSIT";

  return (
    <Badge variant={variant} pulse={pulse} className={className}>
      {status.replace(/_/g, " ")}
    </Badge>
  );
}
