"use client";

import { LobAppIconMark } from "@/components/lob-app-icon-mark";

type Props = {
  className?: string;
  /** When true, hide from assistive tech (use when a parent link has `aria-label`). */
  decorative?: boolean;
  /** Used as image `alt` when `decorative` is false. */
  accessibilityTitle?: string;
};

/**
 * Home / nav mark — raster from `lob-app-icon.png` (same O and ring as production branding), not a vector recreation.
 */
export function LobWoodOIcon({
  className,
  decorative,
  accessibilityTitle = "Lumber One Board home",
}: Props) {
  return (
    <LobAppIconMark
      className={className}
      decorative={decorative}
      accessibilityTitle={accessibilityTitle}
    />
  );
}
