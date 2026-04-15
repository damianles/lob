import Image from "next/image";

import { LOB_MARK_COMPACT_SRC } from "@/lib/brand";

type Props = {
  /** Applied to the sizing wrapper (use `relative`, explicit `h-*` / `w-*` for `fill` layout). */
  className?: string;
  priority?: boolean;
};

/**
 * LOB letters + brand “O” — `fill` + `object-contain` avoids Next/Image’s overflow-hidden wrapper
 * clipping the mark in flex headers (common when only `h-* w-auto` was set on Image).
 */
export function LobBrandMark({ className, priority }: Props) {
  return (
    <div
      className={
        className ??
        "relative h-10 w-[9.5rem] shrink-0 sm:h-11 sm:w-[11rem]"
      }
    >
      <Image
        src={LOB_MARK_COMPACT_SRC}
        alt="LOB"
        fill
        priority={priority}
        sizes="(max-width: 640px) 160px, 180px"
        className="object-contain object-left"
      />
    </div>
  );
}
