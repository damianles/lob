import Image from "next/image";

import { LOB_BRAND_HERO_HEIGHT, LOB_BRAND_HERO_SRC, LOB_BRAND_HERO_WIDTH } from "@/lib/brand";

type Props = {
  className?: string;
  priority?: boolean;
};

/** Full split brand + marketing panel — entry / landing only. */
export function LobBrandHero({ className, priority }: Props) {
  return (
    <Image
      src={LOB_BRAND_HERO_SRC}
      alt="Lumber One Board — The #1 Lumber Load Board"
      width={LOB_BRAND_HERO_WIDTH}
      height={LOB_BRAND_HERO_HEIGHT}
      className={className}
      priority={priority}
    />
  );
}
