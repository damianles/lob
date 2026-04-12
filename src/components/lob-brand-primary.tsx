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

/** Full navy LOB board (LOB + wood O + “Lumber One Board”) — auth pages and anywhere you want the primary mark. */
export function LobBrandPrimary({ className, priority }: Props) {
  return (
    <Image
      src={LOB_CONCEPT_PRIMARY_SRC}
      alt="Lumber One Board — The #1 Lumber Load Board"
      width={LOB_CONCEPT_PRIMARY_WIDTH}
      height={LOB_CONCEPT_PRIMARY_HEIGHT}
      className={className}
      priority={priority}
    />
  );
}
