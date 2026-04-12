import Image from "next/image";

import { LOB_MARK_COMPACT_SRC } from "@/lib/brand";

type Props = {
  /** Applied to the sizing wrapper (use `relative`, explicit `h-*` / `w-*` for `fill` layout). */
  className?: string;
  priority?: boolean;
};

/**
 * LOB letters + wood “O” — `fill` + `object-contain` avoids Next/Image’s overflow-hidden wrapper
 * clipping the mark in flex headers (common when only `h-* w-auto` was set on Image).
 */
export function LobBrandMark({ className, priority }: Props) {
  return (
    <div
      className={
        className ??
        "relative h-9 w-[8.75rem] shrink-0 sm:h-10 sm:w-[10rem]"
      }
    >
      <Image
        src={LOB_MARK_COMPACT_SRC}
        alt="LOB"
        fill
        priority={priority}
        sizes="(max-width: 640px) 148px, 168px"
        className="object-contain object-left"
      />
    </div>
  );
}
