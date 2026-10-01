import Image from "next/image";

import { LOB_BRAND_LOCKUP_HEIGHT, LOB_BRAND_LOCKUP_SRC, LOB_BRAND_LOCKUP_WIDTH } from "@/lib/brand";
import { BRAND_PRODUCT_NAME } from "@/lib/brand-marketing";

type Props = {
  className?: string;
  priority?: boolean;
};

/**
 * Full brand lockup (nested-L | gold rule | LOB / LUMBER ONE BOARD) for light surfaces.
 * Favicon / square mark: use `LobAppIconMark` instead.
 */
export function LobBrandMark({ className, priority }: Props) {
  return (
    <Image
      src={LOB_BRAND_LOCKUP_SRC}
      alt={BRAND_PRODUCT_NAME}
      width={LOB_BRAND_LOCKUP_WIDTH}
      height={LOB_BRAND_LOCKUP_HEIGHT}
      priority={priority}
      quality={100}
      className={className ? `${className} object-contain` : "h-10 w-auto object-contain sm:h-11"}
      sizes="(max-width: 640px) 220px, 280px"
    />
  );
}
