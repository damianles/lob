"use client";

import { useId } from "react";

type Props = {
  className?: string;
  /** When true, hide from assistive tech (use when a parent link has `aria-label`). */
  decorative?: boolean;
  /** Ignored if `decorative`. */
  accessibilityTitle?: string;
};

/**
 * Isolated wood-core “O” for home / back — vector annulus with grain rings (no raster crop).
 */
export function LobWoodOIcon({ className, decorative, accessibilityTitle = "Lumber One Board home" }: Props) {
  const uid = useId().replace(/:/g, "");
  const wood = `lob-wood-rad-${uid}`;
  const shine = `lob-wood-shine-${uid}`;
  const mask = `lob-wood-mask-${uid}`;

  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      role={decorative ? "presentation" : "img"}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : accessibilityTitle}
    >
      <defs>
        <radialGradient id={wood} cx="32%" cy="28%" r="78%">
          <stop offset="0%" stopColor="#f4e4bd" />
          <stop offset="35%" stopColor="#d4a574" />
          <stop offset="72%" stopColor="#9a6a2e" />
          <stop offset="100%" stopColor="#4a3018" />
        </radialGradient>
        <linearGradient id={shine} x1="22%" y1="12%" x2="58%" y2="52%" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
          <stop offset="55%" stopColor="#ffffff" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <mask id={mask}>
          <rect width="48" height="48" fill="white" />
          <circle cx="24" cy="24" r="10.75" fill="black" />
        </mask>
      </defs>
      {/* Wood annulus */}
      <circle cx="24" cy="24" r="22" fill={`url(#${wood})`} mask={`url(#${mask})`} />
      {/* Growth rings (inside ring only — visually clipped by mask edges) */}
      <g
        mask={`url(#${mask})`}
        fill="none"
        stroke="#3d2814"
        strokeWidth="0.35"
        strokeOpacity="0.5"
      >
        <circle cx="24" cy="24" r="13.5" />
        <circle cx="24" cy="24" r="16.25" />
        <circle cx="24" cy="24" r="19" />
        <circle cx="24" cy="24" r="21.25" />
      </g>
      <circle cx="24" cy="24" r="22" fill={`url(#${shine})`} mask={`url(#${mask})`} />
      {/* Navy outer rim */}
      <circle
        cx="24"
        cy="24"
        r="22"
        fill="none"
        stroke="var(--lob-navy, #001233)"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
      <circle
        cx="24"
        cy="24"
        r="10.75"
        fill="none"
        stroke="var(--lob-navy, #001233)"
        strokeWidth="1"
        strokeOpacity="0.85"
      />
    </svg>
  );
}
