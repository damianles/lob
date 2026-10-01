import Image from "next/image";

import {
  LOB_CONCEPT_PRIMARY_HEIGHT,
  LOB_CONCEPT_PRIMARY_SRC,
  LOB_CONCEPT_PRIMARY_WIDTH,
} from "@/lib/brand";

type Props = {
  className?: string;
  priority?: boolean;
};

/** Marketing concept card (nested-L mark + tagline) — auth / share surfaces. */
export function LobBrandPrimary({ className, priority }: Props) {
  return (
    <Image
      src={LOB_CONCEPT_PRIMARY_SRC}
      alt="Lumber One Board — The #1 Lumber Load Board"
      width={LOB_CONCEPT_PRIMARY_WIDTH}
      height={LOB_CONCEPT_PRIMARY_HEIGHT}
      className={className}
      priority={priority}
      quality={100}
      sizes="(max-width: 640px) 100vw, 640px"
    />
  );
}
