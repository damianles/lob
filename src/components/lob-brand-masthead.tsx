import Image from "next/image";
import Link from "next/link";

import { LOB_BRAND_LOCKUP_HEIGHT, LOB_BRAND_LOCKUP_SRC, LOB_BRAND_LOCKUP_WIDTH } from "@/lib/brand";
import { BRAND_PRODUCT_NAME } from "@/lib/brand-marketing";

/**
 * Full wordmark above the nav. Avoid `next/image` `fill` here — its wrapper uses `overflow:hidden`
 * and often clips tall lockups; intrinsic width/height + max-height + object-contain is reliable.
 */
export function LobBrandMasthead() {
  return (
    <div className="border-b border-stone-200/55 bg-gradient-to-b from-[#fafaf8] to-white">
      <div className="mx-auto flex max-w-[1680px] items-center px-5 py-2.5 sm:px-8 sm:py-3">
        <Link
          href="/"
          className="inline-flex max-w-[min(92vw,400px)] shrink-0 items-center py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lob-navy/20 focus-visible:ring-offset-2"
          aria-label={`${BRAND_PRODUCT_NAME} — home`}
        >
          <Image
            src={LOB_BRAND_LOCKUP_SRC}
            alt={BRAND_PRODUCT_NAME}
            width={LOB_BRAND_LOCKUP_WIDTH}
            height={LOB_BRAND_LOCKUP_HEIGHT}
            priority
            sizes="(max-width: 640px) 92vw, 400px"
            className="h-auto max-h-[3.5rem] w-auto max-w-full object-contain object-left drop-shadow-[0_1px_1px_rgba(0,18,51,0.04)] sm:max-h-[3.85rem]"
          />
        </Link>
      </div>
    </div>
  );
}
