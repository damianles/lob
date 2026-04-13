import Image from "next/image";
import Link from "next/link";

import { LOB_BRAND_LOCKUP_SRC } from "@/lib/brand";
import { BRAND_PRODUCT_NAME } from "@/lib/brand-marketing";

/**
 * Full wordmark above the nav — `fill` + `object-contain` + generous height avoids clipping descenders
 * (fixed small boxes were cropping the lockup PNG).
 */
export function LobBrandMasthead() {
  return (
    <div className="border-b border-stone-200/55 bg-gradient-to-b from-[#fafaf8] to-white">
      <div className="mx-auto flex max-w-[1680px] items-center px-5 py-2.5 sm:px-8 sm:py-3">
        <Link
          href="/"
          className="relative block h-11 w-[min(88vw,300px)] shrink-0 overflow-visible sm:h-[3.25rem] sm:w-[min(88vw,340px)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lob-navy/20 focus-visible:ring-offset-2"
          aria-label={`${BRAND_PRODUCT_NAME} — home`}
        >
          <Image
            src={LOB_BRAND_LOCKUP_SRC}
            alt={BRAND_PRODUCT_NAME}
            fill
            priority
            sizes="(max-width: 640px) 280px, 340px"
            className="object-contain object-left drop-shadow-[0_1px_1px_rgba(0,18,51,0.04)]"
          />
        </Link>
      </div>
    </div>
  );
}
