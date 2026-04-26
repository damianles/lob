import Image from "next/image";
import Link from "next/link";

import { LobAppIconMark } from "@/components/lob-app-icon-mark";
import { LOB_BRAND_LOCKUP_HEIGHT, LOB_BRAND_LOCKUP_SRC, LOB_BRAND_LOCKUP_WIDTH } from "@/lib/brand";
import { BRAND_PRODUCT_NAME } from "@/lib/brand-marketing";

/**
 * Branded masthead.
 *
 * - On mobile (< sm): collapses to a thin 36px bar with only the wood-O mark.
 *   The full wordmark eats too much vertical space on phones, leaving
 *   little room for actual content.
 * - On desktop (>= sm): full wordmark lockup (with anti-clip styling — we
 *   intentionally avoid `next/image` `fill` here because its wrapper
 *   uses `overflow:hidden` and clips tall lockups; intrinsic width/height
 *   plus max-height + object-contain is reliable).
 */
export function LobBrandMasthead() {
  return (
    <div className="border-b border-stone-200/55 bg-gradient-to-b from-[#fafaf8] to-white">
      <Link
        href="/"
        className="mx-auto flex h-9 max-w-[1680px] items-center px-4 sm:hidden"
        aria-label={`${BRAND_PRODUCT_NAME} — home`}
      >
        <LobAppIconMark className="h-7 w-7" decorative />
        <span className="ml-2 text-[11px] font-semibold tracking-wide text-lob-navy">
          LUMBER ONE BOARD
        </span>
      </Link>

      <div className="mx-auto hidden max-w-[1680px] items-center px-5 py-3 sm:flex sm:px-8 sm:py-3.5">
        <Link
          href="/"
          className="inline-flex max-w-[min(94vw,640px)] shrink-0 items-center py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lob-navy/20 focus-visible:ring-offset-2"
          aria-label={`${BRAND_PRODUCT_NAME} — home`}
        >
          <Image
            src={LOB_BRAND_LOCKUP_SRC}
            alt={BRAND_PRODUCT_NAME}
            width={LOB_BRAND_LOCKUP_WIDTH}
            height={LOB_BRAND_LOCKUP_HEIGHT}
            priority
            sizes="(max-width: 640px) 94vw, 640px"
            // The approved horizontal lockup PNG (1024×799) has substantial
            // top/bottom whitespace inside the canvas, so we let the image
            // run a bit taller than the old square lockup to compensate.
            className="h-auto max-h-[5.5rem] w-auto max-w-full object-contain object-left drop-shadow-[0_1px_1px_rgba(0,18,51,0.04)] sm:max-h-[7rem] lg:max-h-[8rem]"
          />
        </Link>
      </div>
    </div>
  );
}
