import Image from "next/image";

import { LOB_APP_ICON_SIZE, LOB_APP_ICON_SRC } from "@/lib/brand";
import { BRAND_PRODUCT_NAME } from "@/lib/brand-marketing";

type Props = {
  className?: string;
  priority?: boolean;
};

/**
 * Raster app icon — `public/brand/lob-app-icon.png` (wood-core O). Replaces the legacy SVG gold ring.
 * Size with Tailwind on `className` (e.g. `h-9 w-9`).
 */
export function LobAppIconMark({ className, priority }: Props) {
  return (
    <Image
      src={LOB_APP_ICON_SRC}
      alt=""
      width={LOB_APP_ICON_SIZE}
      height={LOB_APP_ICON_SIZE}
      priority={priority}
      className={className}
      sizes="40px"
      aria-hidden
    />
  );
}

export function lobAppIconAlt(): string {
  return `${BRAND_PRODUCT_NAME} — home`;
}
