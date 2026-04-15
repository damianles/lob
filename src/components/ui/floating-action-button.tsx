"use client";

import type { ReactNode } from "react";

export interface FABProps {
  onClick: () => void;
  icon?: ReactNode;
  label?: string;
  className?: string;
}

export function FloatingActionButton({
  onClick,
  icon,
  label,
  className = "",
}: FABProps) {
  return (
    <button
      onClick={onClick}
      className={`
        fixed bottom-20 right-4 z-40
        lg:hidden
        flex items-center gap-2
        ${label ? "pl-5 pr-4 py-3.5 rounded-full" : "w-14 h-14 rounded-full justify-center"}
        bg-lob-navy text-white
        shadow-lg shadow-lob-navy/30
        hover:shadow-xl hover:shadow-lob-navy/40
        active:scale-95
        transition-all duration-200
        font-semibold text-sm
        ${className}
      `}
      aria-label={label || "Primary action"}
      type="button"
    >
      {icon || (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      )}
      {label && <span>{label}</span>}
    </button>
  );
}

export function PlusIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}
