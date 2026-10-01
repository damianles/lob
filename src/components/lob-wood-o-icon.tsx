"use client";

import { LobAppIconMark } from "@/components/lob-app-icon-mark";

type Props = {
  className?: string;
  /** When true, hide from assistive tech (use when a parent link has `aria-label`). */
  decorative?: boolean;
  /** Used as image `alt` when `decorative` is false. */
  accessibilityTitle?: string;
  /** Match rendered CSS width so retina gets a sharp srcset. */
  sizes?: string;
  priority?: boolean;
};

/**
 * Home / nav mark — raster from `lob-app-icon.png` (nested-L mark).
 */
export function LobWoodOIcon({
  className,
  decorative,
  accessibilityTitle = "Lumber One Board home",
  sizes,
  priority,
}: Props) {
  return (
    <LobAppIconMark
      className={className}
      decorative={decorative}
      accessibilityTitle={accessibilityTitle}
      sizes={sizes}
      priority={priority}
    />
  );
}
