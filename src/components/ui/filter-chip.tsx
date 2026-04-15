"use client";

import type { ReactNode } from "react";

export interface FilterChipProps {
  children: ReactNode;
  onRemove: () => void;
  className?: string;
}

export function FilterChip({ children, onRemove, className = "" }: FilterChipProps) {
  return (
    <div
      className={`
        inline-flex items-center gap-1.5
        px-3 py-1.5 rounded-full
        bg-lob-navy/10 text-lob-navy
        text-sm font-medium
        border border-lob-navy/20
        transition-all hover:bg-lob-navy/15
        ${className}
      `}
    >
      <span>{children}</span>
      <button
        onClick={onRemove}
        className="
          ml-1 -mr-1 p-0.5 rounded-full
          hover:bg-lob-navy/20
          transition-colors
          focus:outline-none focus:ring-2 focus:ring-lob-navy focus:ring-offset-1
        "
        aria-label="Remove filter"
        type="button"
      >
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
}

export function FilterChipGroup({
  children,
  onClearAll,
  className = "",
}: {
  children: ReactNode;
  onClearAll?: () => void;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {children}
      {onClearAll && (
        <button
          onClick={onClearAll}
          className="
            text-sm text-stone-600 hover:text-stone-900
            underline underline-offset-2
            transition-colors
          "
          type="button"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
