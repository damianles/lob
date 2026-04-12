"use client";

import { useId } from "react";

type Props = {
  className?: string;
};

/**
 * Wood-toned “O” ring for the header home control — vector, no clipping, unique gradient ids per instance.
 */
export function LobWoodOMark({ className }: Props) {
  const uid = useId().replace(/:/g, "");
  const gWood = `lob-wood-${uid}`;
  const gShine = `lob-wood-shine-${uid}`;

  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id={gWood} x1="4" y1="4" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#e5c48a" />
          <stop offset="0.4" stopColor="#b58135" />
          <stop offset="1" stopColor="#5c3d1a" />
        </linearGradient>
        <linearGradient id={gShine} x1="10" y1="8" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffffff" stopOpacity="0.5" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <circle
        cx="20"
        cy="20"
        r="13.25"
        fill="none"
        stroke={`url(#${gWood})`}
        strokeWidth="7.5"
        strokeLinecap="round"
      />
      <circle
        cx="20"
        cy="20"
        r="13.25"
        fill="none"
        stroke={`url(#${gShine})`}
        strokeWidth="7.5"
        strokeLinecap="round"
        opacity="0.55"
      />
      <circle cx="20" cy="20" r="16.75" fill="none" stroke="#001233" strokeOpacity="0.09" strokeWidth="0.7" />
    </svg>
  );
}
