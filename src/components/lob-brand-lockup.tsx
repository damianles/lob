import Image from "next/image";

import {
  LOB_BRAND_LOCKUP_HEIGHT,
  LOB_BRAND_LOCKUP_SRC,
  LOB_BRAND_LOCKUP_WIDTH,
} from "@/lib/brand";

type Props = {
  className?: string;
  priority?: boolean;
};

/** Full name under LOB — use at most once per page in the main content area. */
export function LobBrandLockup({ className, priority }: Props) {
  return (
    <Image
      src={LOB_BRAND_LOCKUP_SRC}
      alt="Lumber One Board"
      width={LOB_BRAND_LOCKUP_WIDTH}
      height={LOB_BRAND_LOCKUP_HEIGHT}
      className={className}
      priority={priority}
    />
  );
}
