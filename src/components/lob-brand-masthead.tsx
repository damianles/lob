import Image from "next/image";
import Link from "next/link";
import { Oswald } from "next/font/google";

import {
  LOB_APP_ICON_KNOCKOUT_HEIGHT,
  LOB_APP_ICON_KNOCKOUT_SRC,
  LOB_APP_ICON_KNOCKOUT_WIDTH,
} from "@/lib/brand";
import { BRAND_PRODUCT_NAME } from "@/lib/brand-marketing";

const mastheadLob = Oswald({
  weight: "700",
  subsets: ["latin"],
  display: "swap",
});

/**
 * Navy masthead: nested-L mark | gold rule | LOB only (no subtitle).
 * Composed in HTML/CSS so the wordmark stays sharp at large sizes.
 * Full lockup with “LUMBER ONE BOARD” stays on print/marketing assets.
 */
export function LobBrandMasthead() {
  return (
    <div className="w-full bg-lob-navy">
      <Link
        href="/"
        className="mx-auto flex h-[5rem] w-full max-w-[1680px] items-center justify-center px-4 sm:h-[6rem] sm:px-8"
        aria-label={`${BRAND_PRODUCT_NAME} — home`}
      >
        <span className="inline-flex items-center gap-3 sm:gap-4">
          <Image
            src={LOB_APP_ICON_KNOCKOUT_SRC}
            alt=""
            width={LOB_APP_ICON_KNOCKOUT_WIDTH}
            height={LOB_APP_ICON_KNOCKOUT_HEIGHT}
            priority
            quality={100}
            aria-hidden
            className="h-11 w-11 object-contain sm:h-14 sm:w-14"
            sizes="(max-width: 640px) 44px, 56px"
          />
          <span
            aria-hidden
            className="h-9 w-0.5 shrink-0 self-center bg-[#b58135] sm:h-11"
          />
          <span
            className={`${mastheadLob.className} text-[2.75rem] font-bold leading-none tracking-[0.04em] text-white sm:text-[3.5rem]`}
          >
            LOB
          </span>
        </span>
      </Link>
    </div>
  );
}
