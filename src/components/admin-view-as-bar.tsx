"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";

import { useViewerRole } from "@/components/providers/app-providers";
import { roleAccentClasses } from "@/lib/viewer-role";
import { VIEW_AS_PRESETS, viewAsLabel, type ViewAsPayload } from "@/lib/view-as";

/**
 * Admin-only role-perspective switcher.
 *
 * Lets LOB admins pick "View as Mill", "View as Asset Carrier", etc. Sets the
 * `lob.viewAs` cookie via POST /api/admin/view-as, then forces a full page
 * reload so server components re-render with the simulated role applied. When
 * simulating, the bar shows a clear "Reset to admin" pill with the active
 * persona label.
 *
 * Hidden entirely for non-admins (the `realKind` check keeps it safe even
 * while a viewer is mid-simulation — the real role is what gates visibility).
 */

const Z_MENU = 110; /* > AppNav z-50, > admin bar z-100 */
const MARGIN = 8;

type MenuBox = { top: number; left: number; width: number; maxH: number };

function measureMenuBox(button: HTMLElement | null): MenuBox | null {
  if (typeof window === "undefined" || !button) return null;
  const rect = button.getBoundingClientRect();
  const vh = window.innerHeight;
  const vw = window.innerWidth;
  const narrow = vw < 640;
  const cap = 448; // ~28rem
  const width = narrow ? vw - 2 * MARGIN : Math.min(320, vw - 2 * MARGIN);
  const left = narrow
    ? MARGIN
    : Math.max(MARGIN, Math.min(rect.right - width, vw - width - MARGIN));

  const topBelow = rect.bottom + 6;
  const maxBelow = vh - topBelow - MARGIN;
  const maxUpperRegion = Math.max(0, rect.top - MARGIN - 6);
  if (maxBelow < 100 && maxUpperRegion > maxBelow) {
    const maxH = Math.max(120, Math.min(cap, 0.72 * vh, maxUpperRegion));
    const top = Math.max(MARGIN, rect.top - 6 - maxH);
    return { top, left, width, maxH };
  }
  const maxH = Math.max(120, Math.min(cap, 0.72 * vh, maxBelow));
  return { top: topBelow, left, width, maxH };
}

export function AdminViewAsBar() {
  const { viewer, refresh } = useViewerRole();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [menuBox, setMenuBox] = useState<MenuBox | null>(null);
  const [mounted, setMounted] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const updateMenuBox = useCallback(() => {
    if (!open) {
      setMenuBox(null);
      return;
    }
    const box = measureMenuBox(triggerRef.current);
    setMenuBox(box);
  }, [open]);

  useLayoutEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    updateMenuBox();
  }, [open, updateMenuBox]);

  useEffect(() => {
    if (!open) return;
    const on = () => updateMenuBox();
    window.addEventListener("resize", on);
    window.addEventListener("scroll", on, true);
    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener("resize", on);
      vv.addEventListener("scroll", on);
    }
    return () => {
      window.removeEventListener("resize", on);
      window.removeEventListener("scroll", on, true);
      if (vv) {
        vv.removeEventListener("resize", on);
        vv.removeEventListener("scroll", on);
      }
    };
  }, [open, updateMenuBox]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      }
    };
    const onDocMouseDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (barRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("mousedown", onDocMouseDown, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("mousedown", onDocMouseDown, true);
    };
  }, [open]);

  if (viewer.realKind !== "ADMIN") return null;

  const reset = async () => {
    try {
      await fetch("/api/admin/view-as", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload: null }),
      });
    } catch {
      /* swallow — UI will refresh anyway */
    }
    setOpen(false);
    startTransition(() => {
      refresh();
      // router.refresh re-runs server components with the cleared cookie
      // (the load board, supplier form, etc. all re-derive against actor.role).
      router.refresh();
    });
  };

  const apply = async (payload: ViewAsPayload) => {
    try {
      await fetch("/api/admin/view-as", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload }),
      });
    } catch {
      /* ignore */
    }
    setOpen(false);
    startTransition(() => {
      refresh();
      router.refresh();
    });
  };

  // When simulating, paint the bar in the simulated role's accent so admin
  // experiences the visual identity each user sees.
  const accent = roleAccentClasses(viewer.kind);
  const simulating = viewer.simulated;
  const personaLabel = simulating
    ? `${viewer.label}${viewer.companyName ? ` · ${viewer.companyName}` : ""}`
    : "Admin view";

  return (
    <div
      ref={barRef}
      className={`border-b ${simulating ? accent.ribbonBorder : "border-amber-300"} ${
        simulating ? accent.ribbonBg : "bg-amber-50"
      } ${
        /* Stacking: AppNav is z-50 (sticky) — the menu must not paint under the nav. Lift this shell while open. */
        open ? "relative z-[100]" : "relative"
      }`}
      role="region"
      aria-label="Admin role-view switcher"
    >
      <div className="mx-auto flex max-w-[1680px] flex-wrap items-center justify-between gap-2 px-5 py-1.5 text-[11px] sm:px-8 sm:text-xs">
        <div className={`flex min-w-0 items-center gap-2 ${simulating ? accent.ribbonText : "text-amber-900"}`}>
          <span
            aria-hidden
            className={`inline-flex h-5 w-5 items-center justify-center rounded-full ${
              simulating ? accent.pillBg : "bg-amber-600"
            } text-[10px] font-bold ${simulating ? accent.pillText : "text-white"}`}
          >
            {simulating ? "👁" : "★"}
          </span>
          <span className="font-semibold uppercase tracking-wider">
            {simulating ? "Viewing as" : "Admin"}
          </span>
          <span className="truncate font-semibold">{personaLabel}</span>
          {simulating && (
            <span className="hidden rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider sm:inline-block">
              UX simulation · admin powers preserved
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {simulating && (
            <button
              type="button"
              onClick={reset}
              disabled={pending}
              className="inline-flex min-h-9 items-center rounded-full bg-white px-3 text-[11px] font-semibold text-stone-800 ring-1 ring-stone-300 transition hover:bg-stone-50 disabled:opacity-60"
            >
              Reset to admin
            </button>
          )}
          <div className="relative">
            <button
              ref={triggerRef}
              type="button"
              onClick={() => setOpen((o) => !o)}
              disabled={pending}
              aria-haspopup="menu"
              aria-expanded={open}
              className={`inline-flex min-h-9 min-w-[5.5rem] items-center justify-center gap-1 rounded-full px-3 text-[11px] font-semibold transition disabled:opacity-60 ${
                simulating
                  ? `${accent.pillBg} ${accent.pillText} hover:opacity-90`
                  : "bg-amber-600 text-white hover:bg-amber-700"
              }`}
            >
              {simulating ? "Switch role" : "View as…"}
              <span aria-hidden>▾</span>
            </button>
            {open &&
              mounted &&
              menuBox &&
              createPortal(
                <div
                  ref={menuRef}
                  role="menu"
                  style={{
                    position: "fixed",
                    zIndex: Z_MENU,
                    top: menuBox.top,
                    left: menuBox.left,
                    width: menuBox.width,
                    maxHeight: menuBox.maxH,
                  }}
                  className="max-h-[inherit] flex flex-col overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xl ring-1 ring-stone-900/5 [scrollbar-gutter:stable]"
                >
                  <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-1.5">
                    <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-stone-500">
                      See LOB the way they see it
                    </p>
                    <ul className="space-y-0.5 pr-0.5">
                      {VIEW_AS_PRESETS.map((preset) => {
                        const isActive =
                          simulating &&
                          viewer.kind ===
                            (preset.payload.role === "SHIPPER"
                              ? "SHIPPER"
                              : preset.payload.role === "ADMIN"
                                ? "ADMIN"
                                : "CARRIER") &&
                          viewAsLabel(preset.payload) === viewer.label;
                        return (
                          <li key={preset.id}>
                            <button
                              type="button"
                              role="menuitemradio"
                              aria-checked={isActive}
                              onClick={() => apply(preset.payload)}
                              disabled={pending}
                              className={`flex min-h-11 w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left text-[12px] leading-snug transition hover:bg-stone-50 active:bg-stone-100 disabled:opacity-60 ${
                                isActive ? "bg-stone-50 ring-1 ring-stone-200" : ""
                              }`}
                            >
                              <span
                                aria-hidden
                                className={`mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold ${
                                  preset.payload.role === "SHIPPER"
                                    ? "bg-lob-navy text-white"
                                    : "bg-emerald-600 text-white"
                                }`}
                              >
                                {preset.label.slice(0, 1)}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block font-semibold text-stone-800">{preset.label}</span>
                                <span className="block text-[11px] leading-snug text-stone-500">
                                  {preset.hint}
                                </span>
                              </span>
                              {isActive && (
                                <span className="mt-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                                  Active
                                </span>
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                    {simulating && (
                      <div className="mt-1 border-t border-stone-100 px-3 py-2">
                        <button
                          type="button"
                          onClick={reset}
                          disabled={pending}
                          className="min-h-10 w-full text-left text-[11px] font-semibold text-stone-700 underline-offset-2 hover:underline disabled:opacity-60"
                        >
                          ← Back to admin view
                        </button>
                      </div>
                    )}
                  </div>
                </div>,
                document.body,
              )}
          </div>
        </div>
      </div>
    </div>
  );
}
