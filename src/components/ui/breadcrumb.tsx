import Link from "next/link";
import { Fragment, type ReactNode } from "react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: ReactNode;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

function ChevronRightIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5l7 7-7 7"
      />
    </svg>
  );
}

export function Breadcrumb({ items, className = "" }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={`flex items-center gap-2 text-sm ${className}`}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <Fragment key={index}>
            {index > 0 && <ChevronRightIcon className="w-4 h-4 text-stone-400 shrink-0" />}

            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="
                  flex items-center gap-1.5
                  text-stone-600 hover:text-lob-navy
                  transition-colors
                "
              >
                {item.icon && <span className="shrink-0">{item.icon}</span>}
                <span className="truncate">{item.label}</span>
              </Link>
            ) : (
              <span
                className={`
                  flex items-center gap-1.5 truncate
                  ${isLast ? "text-stone-900 font-medium" : "text-stone-600"}
                `}
                aria-current={isLast ? "page" : undefined}
              >
                {item.icon && <span className="shrink-0">{item.icon}</span>}
                <span className="truncate">{item.label}</span>
              </span>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
