import Image from "next/image";
import Link from "next/link";

import {
  LOB_DARK_WORDMARK_HEIGHT,
  LOB_DARK_WORDMARK_SRC,
  LOB_DARK_WORDMARK_WIDTH,
} from "@/lib/brand";
import { BRAND_PRODUCT_NAME } from "@/lib/brand-marketing";

/**
 * Branded masthead — full-bleed navy bar with the dark wordmark only
 * (“Lumber One Board”, gold “One”). The LOB acronym lockup stays for
 * sidebar / other chrome — not this bar.
 */
export function LobBrandMasthead() {
  return (
    <div className="w-full bg-lob-navy">
      <Link
        href="/"
        className="mx-auto flex w-full items-center justify-center px-4 py-4 sm:px-8 sm:py-5"
        aria-label={`${BRAND_PRODUCT_NAME} — home`}
      >
        <Image
          src={LOB_DARK_WORDMARK_SRC}
          alt={BRAND_PRODUCT_NAME}
          width={LOB_DARK_WORDMARK_WIDTH}
          height={LOB_DARK_WORDMARK_HEIGHT}
          priority
          sizes="(max-width: 640px) 92vw, (max-width: 1280px) 80vw, 72rem"
          className="h-auto w-[min(92vw,72rem)] object-contain"
        />
      </Link>
    </div>
  );
}
