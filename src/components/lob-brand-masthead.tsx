import Link from "next/link";
import { Nunito } from "next/font/google";

import { BRAND_PRODUCT_NAME } from "@/lib/brand-marketing";

const mastheadWordmark = Nunito({
  weight: "800",
  subsets: ["latin"],
  display: "swap",
});

/**
 * Branded masthead — full-bleed navy bar with a vector “Lumber One Board”
 * wordmark (gold “One”). Raster lockup stays for sidebar / other chrome.
 * Vector type stays sharp when scaled across the viewport.
 */
export function LobBrandMasthead() {
  return (
    <div className="w-full bg-lob-navy">
      <Link
        href="/"
        className="mx-auto flex w-full items-center justify-center px-4 py-4 sm:px-8 sm:py-5"
        aria-label={`${BRAND_PRODUCT_NAME} — home`}
      >
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
