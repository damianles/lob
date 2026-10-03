import Image from "next/image";
import Link from "next/link";

import {
  LOB_LOCKUP_KNOCKOUT_HEIGHT,
  LOB_LOCKUP_KNOCKOUT_SRC,
  LOB_LOCKUP_KNOCKOUT_WIDTH,
} from "@/lib/brand";
import { BRAND_PRODUCT_NAME } from "@/lib/brand-marketing";

/**
 * Full-bleed navy masthead with the approved Fav4 + hybrid-05 lockup
 * (mark | gold rule | LOB / LUMBER ONE BOARD, gold ONE). High-res knockout PNG,
 * height-driven so it stays sharp and centered in the rail.
 */
export function LobBrandMasthead() {
  return (
    <div className="w-full bg-lob-navy">
      <Link
        href="/"
        className="mx-auto flex h-[4.75rem] w-full max-w-[1680px] items-center justify-center px-4 sm:h-[5.75rem] sm:px-8"
        aria-label={`${BRAND_PRODUCT_NAME} — home`}
      >
        <Image
          src={LOB_LOCKUP_KNOCKOUT_SRC}
          alt={BRAND_PRODUCT_NAME}
          width={LOB_LOCKUP_KNOCKOUT_WIDTH}
          height={LOB_LOCKUP_KNOCKOUT_HEIGHT}
          priority
          quality={100}
          className="h-12 w-auto max-w-[min(100%,22rem)] object-contain object-center sm:h-[3.75rem] sm:max-w-[28rem]"
          sizes="(max-width: 640px) 352px, 448px"
        />
      </Link>
    </div>
  );
}
