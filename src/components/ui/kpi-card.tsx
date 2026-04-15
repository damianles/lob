import type { ReactNode } from "react";

import { Card, CardBody } from "./card";

export interface KPICardProps {
  title: string;
  value: string | number;
  change?: string;
  trend?: "up" | "down" | "neutral";
  icon?: ReactNode;
  subtitle?: string;
  className?: string;
}

function TrendIcon({ trend }: { trend: "up" | "down" | "neutral" }) {
  if (trend === "neutral") {
    return (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
      </svg>
    );
  }

  return (
    <svg
      className={`w-4 h-4 ${trend === "up" ? "rotate-0" : "rotate-180"}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
    </svg>
  );
}

export function KPICard({
  title,
  value,
  change,
  trend = "neutral",
  icon,
  subtitle,
  className = "",
}: KPICardProps) {
  const trendColors = {
    up: "text-emerald-700 bg-emerald-50",
    down: "text-red-700 bg-red-50",
    neutral: "text-stone-600 bg-stone-50",
  };

  return (
    <Card className={`transition-all hover:shadow-md ${className}`}>
      <CardBody>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-stone-600 mb-3">{title}</p>
            <p className="text-3xl font-bold text-stone-900 mb-2">{value}</p>
            {change && (
              <div
                className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold ${trendColors[trend]}`}
              >
                <TrendIcon trend={trend} />
                <span>{change}</span>
              </div>
            )}
            {subtitle && <p className="text-xs text-stone-500 mt-2">{subtitle}</p>}
          </div>

          {icon && (
            <div className="shrink-0 w-12 h-12 rounded-xl bg-lob-navy/5 flex items-center justify-center text-lob-navy">
              {icon}
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

export function KPICardSkeleton() {
  return (
    <Card>
      <CardBody>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="h-4 w-24 bg-stone-200 rounded animate-pulse mb-3" />
            <div className="h-8 w-32 bg-stone-200 rounded animate-pulse mb-2" />
            <div className="h-5 w-16 bg-stone-200 rounded-full animate-pulse" />
          </div>
          <div className="w-12 h-12 bg-stone-200 rounded-xl animate-pulse" />
        </div>
      </CardBody>
    </Card>
  );
}

export function KPICardGrid({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-4 ${className}`}>{children}</div>;
}
