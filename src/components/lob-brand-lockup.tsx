import Image from "next/image";

import { LOB_BRAND_LOCKUP_SRC } from "@/lib/brand";

type Props = {
  /** Wrapper: include `relative`, height (`h-*`), and max width — required for `fill` image. */
  className?: string;
  priority?: boolean;
};

/** Full “Lumber One Board” lockup — `fill` + `object-contain` prevents vertical cropping. */
export function LobBrandLockup({ className, priority }: Props) {
  return (
    <div
      className={
        className ??
        "relative h-[4.5rem] w-full max-w-[min(100%,260px)] sm:h-[5rem]"
      }
    >
      <Image
        src={LOB_BRAND_LOCKUP_SRC}
        alt="Lumber One Board"
        fill
        priority={priority}
        sizes="(max-width: 640px) 240px, 320px"
        className="object-contain object-left"
      />
    </div>
  );
}
