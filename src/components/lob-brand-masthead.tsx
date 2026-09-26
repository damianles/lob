import Link from "next/link";
import { Nunito } from "next/font/google";

import { LobAppIconMark } from "@/components/lob-app-icon-mark";
import { BRAND_PRODUCT_NAME } from "@/lib/brand-marketing";

const mastheadWordmark = Nunito({
  weight: "800",
  subsets: ["latin"],
  display: "swap",
});

/**
 * Branded masthead — full-bleed navy bar with the square LOB mark to the
 * left of the vector “Lumber One Board” wordmark (gold “One”).
 */
export function LobBrandMasthead() {
  return (
    <div className="w-full bg-lob-navy">
      <Link
        href="/"
        className="mx-auto flex w-full items-center justify-center gap-3 px-4 py-3 sm:gap-5 sm:px-8 sm:py-4"
        aria-label={`${BRAND_PRODUCT_NAME} — home`}
      >
        <LobAppIconMark
          className="h-[clamp(2.25rem,7vw,5.25rem)] w-[clamp(2.25rem,7vw,5.25rem)] shrink-0 rounded-lg sm:rounded-xl"
          decorative
          priority
          sizes="(max-width: 640px) 72px, (max-width: 1280px) 112px, 168px"
        />
        <span
          className={`${mastheadWordmark.className} whitespace-nowrap text-[clamp(1.65rem,7.2vw,5.25rem)] font-extrabold leading-none tracking-[-0.03em]`}
        >
          <span className="text-white">Lumber</span>
          <span className="text-[#98662a]"> One </span>
          <span className="text-white">Board</span>
        </span>
      </Link>
    </div>
  );
}
