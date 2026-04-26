"use client";

import { useAuth } from "@clerk/nextjs";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import {
  DISTANCE_UNIT_STORAGE_KEY,
  type DistanceUnit,
} from "@/lib/units";
import { deriveViewerRole, type MeApiResponse, type ViewerRole } from "@/lib/viewer-role";

type UnitCtx = {
  distanceUnit: DistanceUnit;
  setDistanceUnit: (u: DistanceUnit) => void;
};

const DistanceUnitContext = createContext<UnitCtx | null>(null);

type ViewerRoleCtx = {
  viewer: ViewerRole;
  loading: boolean;
  refresh: () => void;
};

const ViewerRoleContext = createContext<ViewerRoleCtx | null>(null);

const guestViewer: ViewerRole = deriveViewerRole(null);

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [distanceUnit, setDistanceUnitState] = useState<DistanceUnit>("mi");

  useEffect(() => {
    try {
      const v = localStorage.getItem(DISTANCE_UNIT_STORAGE_KEY);
      if (v === "km" || v === "mi") setDistanceUnitState(v);
    } catch {
      /* ignore */
    }
  }, []);

  const setDistanceUnit = useCallback((u: DistanceUnit) => {
    setDistanceUnitState(u);
    try {
      localStorage.setItem(DISTANCE_UNIT_STORAGE_KEY, u);
    } catch {
      /* ignore */
    }
  }, []);

  const unitsValue = useMemo(
    () => ({ distanceUnit, setDistanceUnit }),
    [distanceUnit, setDistanceUnit],
  );

  // Viewer role
  const { isSignedIn, isLoaded } = useAuth();
  const [viewer, setViewer] = useState<ViewerRole>(guestViewer);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setViewer(guestViewer);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void fetch("/api/me", { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<MeApiResponse>) : null))
      .then((d) => {
        if (cancelled) return;
        setViewer(deriveViewerRole(d));
      })
      .catch(() => {
        if (!cancelled) setViewer(guestViewer);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isSignedIn, isLoaded, tick]);

  const viewerValue = useMemo(() => ({ viewer, loading, refresh }), [viewer, loading, refresh]);

  return (
    <DistanceUnitContext.Provider value={unitsValue}>
      <ViewerRoleContext.Provider value={viewerValue}>{children}</ViewerRoleContext.Provider>
    </DistanceUnitContext.Provider>
  );
}

export function useDistanceUnitPreference(): UnitCtx {
  const ctx = useContext(DistanceUnitContext);
  if (!ctx) {
    throw new Error("useDistanceUnitPreference must be used within AppProviders");
  }
  return ctx;
}

export function useViewerRole(): ViewerRoleCtx {
  const ctx = useContext(ViewerRoleContext);
  if (!ctx) {
    throw new Error("useViewerRole must be used within AppProviders");
  }
  return ctx;
}
