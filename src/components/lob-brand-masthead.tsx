import Link from "next/link";

import { LobAppIconMark } from "@/components/lob-app-icon-mark";
import { BRAND_POSITIONING, BRAND_PRODUCT_NAME } from "@/lib/brand-marketing";

/**
 * Branded masthead — full-bleed top bar with the square mark + wordmark +
 * tagline lockup centered across the viewport (same composition as the
 * approved LOB square + “Lumber One Board” + “THE #1 LUMBER LOAD BOARD”).
 */
export function LobBrandMasthead() {
  return (
    <div className="w-full border-b border-stone-200/55 bg-white">
      <Link
        href="/"
        className="mx-auto flex w-full items-center justify-center gap-3 px-4 py-3 sm:gap-4 sm:px-8 sm:py-4"
        aria-label={`${BRAND_PRODUCT_NAME} — home`}
      >
        <LobAppIconMark
          className="h-10 w-10 shrink-0 drop-shadow-sm sm:h-14 sm:w-14"
          decorative
          priority
        />
        <div className="min-w-0 text-left">
          <p className="text-base font-semibold leading-tight tracking-tight text-lob-navy sm:text-2xl">
            {BRAND_PRODUCT_NAME}
          </p>
          <p className="mt-0.5 text-[9px] font-bold uppercase leading-snug tracking-[0.14em] text-lob-gold-muted sm:mt-1 sm:text-xs sm:tracking-[0.16em]">
            {BRAND_POSITIONING}
          </p>
        </div>
      </Link>
    </div>
  );
}
