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
 * Compact app bar. The large marketing lockup is not repeated here.
 * Knockout LOB letters sit on the navy field. Gold is only the word “One”.
 */
export function LobBrandMasthead() {
  return (
    <div className="w-full bg-lob-navy">
      <Link
        href="/"
        className="mx-auto flex h-14 w-full max-w-[1680px] items-center gap-2.5 px-4 sm:px-8"
        aria-label={`${BRAND_PRODUCT_NAME} — home`}
      >
        <LobAppIconMark
          src={LOB_APP_ICON_KNOCKOUT_SRC}
          width={LOB_APP_ICON_KNOCKOUT_WIDTH}
          height={LOB_APP_ICON_KNOCKOUT_HEIGHT}
          className="h-7 w-auto shrink-0"
          decorative
          priority
          sizes="80px"
        />
        <span
          className={`${mastheadWordmark.className} whitespace-nowrap text-lg font-extrabold leading-none tracking-[-0.03em] sm:text-xl`}
        >
          <span className="text-white">Lumber</span>
          <span className="text-[#e4c07a]"> One </span>
          <span className="text-white">Board</span>
        </span>
      </Link>
    </div>
  );
}
