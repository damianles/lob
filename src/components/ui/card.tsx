import { forwardRef, type HTMLAttributes, type ReactNode } from "react";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  interactive?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ hover = false, interactive = false, className = "", children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`
          rounded-xl border border-stone-200 bg-white
          ${hover ? "transition-shadow hover:shadow-lg" : "shadow-sm"}
          ${interactive ? "cursor-pointer transition-transform hover:scale-[1.01] active:scale-[0.99]" : ""}
          ${className}
        `}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

export function CardHeader({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`px-6 py-4 border-b border-stone-100 ${className}`}>{children}</div>;
}

export function CardBody({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`px-6 py-4 ${className}`}>{children}</div>;
}

export function CardFooter({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`px-6 py-4 border-t border-stone-100 ${className}`}>{children}</div>;
}
