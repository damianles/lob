import Image from "next/image";
import Link from "next/link";

import {
  LOB_DARK_LOCKUP_HEIGHT,
  LOB_DARK_LOCKUP_SRC,
  LOB_DARK_LOCKUP_WIDTH,
} from "@/lib/brand";
import { BRAND_PRODUCT_NAME } from "@/lib/brand-marketing";

/**
 * Branded masthead — full-bleed navy bar with the dark lockup (white LOB +
 * “Lumber One Board”) centered. No positioning tagline here — the product
 * name already carries the brand.
 */
export function LobBrandMasthead() {
  return (
    <div className="w-full bg-lob-navy">
      <Link
        href="/"
        className="mx-auto flex w-full items-center justify-center px-4 py-3 sm:px-8 sm:py-4"
        aria-label={`${BRAND_PRODUCT_NAME} — home`}
      >
        <Image
          src={LOB_DARK_LOCKUP_SRC}
          alt={BRAND_PRODUCT_NAME}
          width={LOB_DARK_LOCKUP_WIDTH}
          height={LOB_DARK_LOCKUP_HEIGHT}
          priority
          sizes="(max-width: 640px) 72vw, 420px"
          className="h-auto max-h-[4.5rem] w-auto max-w-[min(92vw,26rem)] object-contain drop-shadow-sm sm:max-h-[6.5rem] sm:max-w-[min(90vw,32rem)]"
        />
      </Link>
    </div>
  );
}
