import Image from "next/image";
import Link from "next/link";

import { LOB_BRAND_LOCKUP_HEIGHT, LOB_BRAND_LOCKUP_SRC, LOB_BRAND_LOCKUP_WIDTH } from "@/lib/brand";
import { BRAND_PRODUCT_NAME } from "@/lib/brand-marketing";

/**
 * Slim full wordmark above the main app bar — one calm branding row sitewide (not repeated in page bodies).
 */
export function LobBrandMasthead() {
  const displayH = 40;
  const displayW = Math.round((LOB_BRAND_LOCKUP_WIDTH / LOB_BRAND_LOCKUP_HEIGHT) * displayH);

  return (
    <div className="border-b border-stone-200/55 bg-gradient-to-b from-[#fafaf8] to-white">
      <div className="mx-auto flex h-[3rem] max-w-[1680px] items-center px-5 sm:h-[3.25rem] sm:px-8">
        <Link
          href="/"
          className="relative block h-8 w-[min(72vw,200px)] shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lob-navy/20 focus-visible:ring-offset-2 sm:h-9 sm:w-[min(70vw,240px)]"
          aria-label={`${BRAND_PRODUCT_NAME} — home`}
        >
          <Image
            src={LOB_BRAND_LOCKUP_SRC}
            alt={BRAND_PRODUCT_NAME}
            width={displayW}
            height={displayH}
            className="h-full w-full object-contain object-left"
            priority
            sizes="(max-width: 640px) 200px, 240px"
          />
        </Link>
      </div>
    </div>
  );
}
