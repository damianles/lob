"use client";

import { useAuth } from "@clerk/nextjs";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import {
  DISPLAY_CURRENCY_STORAGE_KEY,
  parseDisplayCurrency,
  writeDisplayCurrencyCookie,
  type DisplayCurrency,
} from "@/lib/display-currency";
import {
  DISTANCE_UNIT_STORAGE_KEY_LEGACY,
  distanceUnitStorageKeyForViewerKind,
  type DistanceUnit,
} from "@/lib/units";
import { deriveViewerRole, type MeApiResponse, type ViewerRole } from "@/lib/viewer-role";

type UnitCtx = {
  distanceUnit: DistanceUnit;
  setDistanceUnit: (u: DistanceUnit) => void;
};

const DistanceUnitContext = createContext<UnitCtx | null>(null);

type CurrencyCtx = {
  displayCurrency: DisplayCurrency;
  setDisplayCurrency: (c: DisplayCurrency) => void;
};

const DisplayCurrencyContext = createContext<CurrencyCtx | null>(null);

type ViewerRoleCtx = {
  viewer: ViewerRole;
  loading: boolean;
  refresh: () => void;
};

const ViewerRoleContext = createContext<ViewerRoleCtx | null>(null);

const guestViewer: ViewerRole = deriveViewerRole(null);

function DistanceUnitProvider({ children }: { children: React.ReactNode }) {
  const { viewer, loading } = useViewerRole();
  const [distanceUnit, setDistanceUnitState] = useState<DistanceUnit>("mi");

  useEffect(() => {
    if (loading) return;
    try {
      const key = distanceUnitStorageKeyForViewerKind(viewer.kind);
      let v = localStorage.getItem(key);
      if (v !== "km" && v !== "mi" && (viewer.kind === "SHIPPER" || viewer.kind === "CARRIER")) {
        const legacy = localStorage.getItem(DISTANCE_UNIT_STORAGE_KEY_LEGACY);
        if (legacy === "km" || legacy === "mi") {
          v = legacy;
          localStorage.setItem(key, legacy);
        }
      }
      if (v === "km" || v === "mi") setDistanceUnitState(v);
      else setDistanceUnitState("mi");
    } catch {
      setDistanceUnitState("mi");
    }
  }, [viewer.kind, loading]);

  const setDistanceUnit = useCallback(
    (u: DistanceUnit) => {
      setDistanceUnitState(u);
      if (loading) return;
      try {
        const key = distanceUnitStorageKeyForViewerKind(viewer.kind);
        localStorage.setItem(key, u);
      } catch {
        /* ignore */
      }
    },
    [viewer.kind, loading],
  );

  const unitsValue = useMemo(() => ({ distanceUnit, setDistanceUnit }), [distanceUnit, setDistanceUnit]);

  return <DistanceUnitContext.Provider value={unitsValue}>{children}</DistanceUnitContext.Provider>;
}

function DisplayCurrencyProvider({ children }: { children: React.ReactNode }) {
  const [displayCurrency, setDisplayCurrencyState] = useState<DisplayCurrency>("CAD");

  useEffect(() => {
    try {
      const stored = parseDisplayCurrency(localStorage.getItem(DISPLAY_CURRENCY_STORAGE_KEY));
      setDisplayCurrencyState(stored);
      writeDisplayCurrencyCookie(stored);
    } catch {
      setDisplayCurrencyState("CAD");
    }
  }, []);

  const setDisplayCurrency = useCallback((c: DisplayCurrency) => {
    setDisplayCurrencyState(c);
    try {
      localStorage.setItem(DISPLAY_CURRENCY_STORAGE_KEY, c);
      writeDisplayCurrencyCookie(c);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(() => ({ displayCurrency, setDisplayCurrency }), [displayCurrency, setDisplayCurrency]);

  return <DisplayCurrencyContext.Provider value={value}>{children}</DisplayCurrencyContext.Provider>;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
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
    <ViewerRoleContext.Provider value={viewerValue}>
      <DistanceUnitProvider>
        <DisplayCurrencyProvider>{children}</DisplayCurrencyProvider>
      </DistanceUnitProvider>
    </ViewerRoleContext.Provider>
  );
}

export function useDistanceUnitPreference(): UnitCtx {
  const ctx = useContext(DistanceUnitContext);
  if (!ctx) {
    throw new Error("useDistanceUnitPreference must be used within AppProviders");
  }
  return ctx;
}

export function useDisplayCurrencyPreference(): CurrencyCtx {
  const ctx = useContext(DisplayCurrencyContext);
  if (!ctx) {
    throw new Error("useDisplayCurrencyPreference must be used within AppProviders");
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
