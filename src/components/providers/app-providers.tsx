"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import {
  DISTANCE_UNIT_STORAGE_KEY,
  type DistanceUnit,
} from "@/lib/units";

type UnitCtx = {
  distanceUnit: DistanceUnit;
  setDistanceUnit: (u: DistanceUnit) => void;
};

const DistanceUnitContext = createContext<UnitCtx | null>(null);

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

  const value = useMemo(
    () => ({ distanceUnit, setDistanceUnit }),
    [distanceUnit, setDistanceUnit],
  );

  return <DistanceUnitContext.Provider value={value}>{children}</DistanceUnitContext.Provider>;
}

export function useDistanceUnitPreference(): UnitCtx {
  const ctx = useContext(DistanceUnitContext);
  if (!ctx) {
    throw new Error("useDistanceUnitPreference must be used within AppProviders");
  }
  return ctx;
}
