import Image from "next/image";
import Link from "next/link";

import {
  LOB_LOCKUP_KNOCKOUT_HEIGHT,
  LOB_LOCKUP_KNOCKOUT_SRC,
  LOB_LOCKUP_KNOCKOUT_WIDTH,
} from "@/lib/brand";
import { BRAND_PRODUCT_NAME } from "@/lib/brand-marketing";

/**
 * Full-bleed navy bar with the complete brand lockup (nested-L mark | gold rule |
 * LOB / LUMBER ONE BOARD). Favicon stays mark-only via `src/app/icon.png`.
 */
export function LobBrandMasthead() {
  return (
    <div className="w-full bg-lob-navy">
      <Link
        href="/"
        className="mx-auto flex h-[4.25rem] w-full max-w-[1680px] items-center justify-center px-4 sm:h-[5.25rem] sm:px-8"
        aria-label={`${BRAND_PRODUCT_NAME} — home`}
      >
        <Image
          src={LOB_LOCKUP_KNOCKOUT_SRC}
          alt={BRAND_PRODUCT_NAME}
          width={LOB_LOCKUP_KNOCKOUT_WIDTH}
          height={LOB_LOCKUP_KNOCKOUT_HEIGHT}
          priority
          quality={100}
          className="h-10 w-auto max-w-[min(100%,20rem)] object-contain sm:h-12 sm:max-w-[24rem]"
          sizes="(max-width: 640px) 280px, 384px"
        />
      </Link>
    </div>
  );
}
