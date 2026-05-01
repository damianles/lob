"use client";

import { useDistanceUnitPreference, useViewerRole } from "@/components/providers/app-providers";
import { RadioChoice } from "@/components/ui/radio-choice";

type Persona = "supplier" | "carrier";

/**
 * Miles vs km preference for load-board EMR (and any other distance UI using the shared hook).
 * Render only on the matching profile page so suppliers set it under supplier chrome and carriers under carrier chrome.
 */
export function DistanceUnitProfilePreference({ persona }: { persona: Persona }) {
  const { viewer, loading } = useViewerRole();
  const { distanceUnit, setDistanceUnit } = useDistanceUnitPreference();

  const ok =
    !loading &&
    ((persona === "supplier" && viewer.kind === "SHIPPER") ||
      (persona === "carrier" && viewer.kind === "CARRIER"));

  if (!ok) return null;

  return (
    <section className="rounded-lg border border-stone-200 bg-stone-50/80 p-4">
      <h2 className="text-sm font-semibold text-stone-900">Distance units</h2>
      <p className="mt-1 text-xs leading-relaxed text-stone-600">
        Used on the load board for <strong>Empty Mile Radius</strong> (how you enter deadhead limits). Filtering still
        runs in miles behind the scenes.
      </p>
      <div className="mt-3">
        <RadioChoice
          label="Show radii in"
          name={`lob-profile-distance-unit-${persona}`}
          value={distanceUnit}
          onChange={setDistanceUnit}
          options={[
            { value: "mi", label: "Miles" },
            { value: "km", label: "Kilometres" },
          ]}
          className="[&_label]:px-3 [&_label]:py-2 [&_label]:text-sm"
        />
      </div>
    </section>
  );
}
