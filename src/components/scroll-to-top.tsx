"use client";

import { usePathname } from "next/navigation";
import { useLayoutEffect } from "react";

function scrollWindowToTop() {
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

/** Jump to the top whenever the route changes (new page, not in-page filters). */
export function ScrollToTop() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    scrollWindowToTop();
  }, [pathname]);

  return null;
}

export { scrollWindowToTop };
