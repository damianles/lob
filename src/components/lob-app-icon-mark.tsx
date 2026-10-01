import Image from "next/image";

import { LOB_APP_ICON_SIZE, LOB_APP_ICON_SRC } from "@/lib/brand";
import { BRAND_PRODUCT_NAME } from "@/lib/brand-marketing";

type Props = {
  className?: string;
  priority?: boolean;
  /** When true, hide from assistive tech — set on nav/home links that already have `aria-label`. */
  decorative?: boolean;
  /** Shown as `alt` when `decorative` is false. */
  accessibilityTitle?: string;
  /** CSS display width hint for Next/Image srcset (match rendered size, not source pixels). */
  sizes?: string;
  src?: string;
  width?: number;
  height?: number;
};

/**
 * Official square mark from `public/brand/lob-app-icon.png` (same asset as favicon / app icon).
 * Size with Tailwind on `className` (e.g. `h-9 w-9`); keep `object-contain` for crisp scaling.
 */
export function LobAppIconMark({
  className,
  priority,
  decorative = false,
  accessibilityTitle = BRAND_PRODUCT_NAME,
  sizes = "(max-width: 640px) 64px, 72px",
  src = LOB_APP_ICON_SRC,
  width = LOB_APP_ICON_SIZE,
  height = LOB_APP_ICON_SIZE,
}: Props) {
  return (
    <Image
      src={src}
      alt={decorative ? "" : accessibilityTitle}
      width={width}
      height={height}
      priority={priority}
      quality={100}
      className={className ? `${className} object-contain` : "object-contain"}
      sizes={sizes}
      aria-hidden={decorative ? true : undefined}
    />
  );
}

export function lobAppIconAlt(): string {
  return `${BRAND_PRODUCT_NAME} — home`;
}
