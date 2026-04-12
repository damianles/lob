import Image from "next/image";

import { LOB_MARK_COMPACT_HEIGHT, LOB_MARK_COMPACT_SRC, LOB_MARK_COMPACT_WIDTH } from "@/lib/brand";

type Props = {
  className?: string;
  priority?: boolean;
};

/** LOB letters + wood “O” only — use in header, sidebar, and anywhere the wordmark should not repeat. */
export function LobBrandMark({ className, priority }: Props) {
  return (
    <Image
      src={LOB_MARK_COMPACT_SRC}
      alt="LOB"
      width={LOB_MARK_COMPACT_WIDTH}
      height={LOB_MARK_COMPACT_HEIGHT}
      className={className}
      priority={priority}
    />
  );
}
