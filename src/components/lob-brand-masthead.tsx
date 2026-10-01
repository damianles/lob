import Link from "next/link";
import { Nunito } from "next/font/google";

import { LobAppIconMark } from "@/components/lob-app-icon-mark";
import {
  LOB_APP_ICON_KNOCKOUT_HEIGHT,
  LOB_APP_ICON_KNOCKOUT_SRC,
  LOB_APP_ICON_KNOCKOUT_WIDTH,
} from "@/lib/brand";
import { BRAND_PRODUCT_NAME } from "@/lib/brand-marketing";

const mastheadWordmark = Nunito({
  weight: "800",
  subsets: ["latin"],
  display: "swap",
});

/**
 * Navy bar. Knockout LOB stays on the left. “Lumber One Board” is centered
 * and twice the previous app size (2.5rem from the small breakpoint up).
 * Phones use a smaller centered size so the words do not run into the mark.
 */
export function LobBrandMasthead() {
  return (
    <div className="w-full bg-lob-navy">
      <Link
        href="/"
        className="relative flex h-[4.25rem] w-full items-center justify-center px-4 sm:h-[5.25rem] sm:px-8"
        aria-label={`${BRAND_PRODUCT_NAME} — home`}
      >
        <LobAppIconMark
          src={LOB_APP_ICON_KNOCKOUT_SRC}
          width={LOB_APP_ICON_KNOCKOUT_WIDTH}
          height={LOB_APP_ICON_KNOCKOUT_HEIGHT}
          className="absolute left-4 h-7 w-auto sm:left-8 sm:h-9"
          decorative
          priority
          sizes="(max-width: 640px) 96px, 128px"
        />
        <span
          className={`${mastheadWordmark.className} whitespace-nowrap text-[clamp(1.35rem,5.6vw,2.5rem)] font-extrabold leading-none tracking-[-0.03em]`}
        >
          <span className="text-white">Lumber</span>
          <span className="text-[#e4c07a]"> One </span>
          <span className="text-white">Board</span>
        </span>
      </Link>
    </div>
  );
}
