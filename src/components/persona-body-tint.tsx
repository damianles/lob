"use client";

import { useEffect } from "react";

import { useViewerRole } from "@/components/providers/app-providers";
import { personaToneFromViewer } from "@/lib/viewer-role";

/**
 * Sets `data-persona` on <body> so globals.css can wash page backgrounds by
 * supplier (wood) or carrier (sky).
 */
export function PersonaBodyTint() {
  const { viewer, loading } = useViewerRole();

  useEffect(() => {
    if (loading) return;
    const tone = personaToneFromViewer(viewer);
    const el = document.body;
    if (tone === "guest") {
      el.removeAttribute("data-persona");
      return;
    }
    el.setAttribute("data-persona", tone);
    return () => {
      el.removeAttribute("data-persona");
    };
  }, [viewer, loading]);

  return null;
}
