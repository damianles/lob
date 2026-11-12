"use client";

import { useEffect, useState } from "react";

import { CarrierScorecard, type ScorecardDocChip } from "@/components/carrier-scorecard";
import { CreditFilePanel } from "@/components/credit-file-panel";
import type { CreditFileView } from "@/lib/credit-file";
import type { CarrierPerformanceStats } from "@/lib/carrier-performance";

type DiligencePayload = {
  carrier: {
    legalName: string;
    dotNumber: string | null;
    mcNumber: string | null;
    carrierType: "ASSET_BASED" | "BROKER" | null;
    isOwnerOperator: boolean;
    fleetTruckCount: number | null;
    fleetTrailerCount: number | null;
    trailerEquipmentTypes: string | null;
    carrierProfileBlurb: string | null;
    verificationStatus: "PENDING" | "APPROVED" | "REJECTED";
    reliabilityScore?: number | null;
  };
  passport: ScorecardDocChip[];
  insurance: {
    current: boolean;
    expiringSoon: boolean;
    expiresAt: string | null;
    cargoCoverageUsd: number | null;
    autoLiabilityCoverageUsd: number | null;
    coverageVerified: boolean;
  } | null;
  performance: CarrierPerformanceStats | null;
  creditFile: CreditFileView | null;
  creditFileAvailable: boolean;
};

export function ShipperCarrierDiligencePanel({
  carrierCompanyId,
  compact,
}: {
  carrierCompanyId: string;
  compact?: boolean;
}) {
  const [data, setData] = useState<DiligencePayload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    void fetch(`/api/shipper/carriers/${carrierCompanyId}/diligence`)
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(typeof json.error === "string" ? json.error : "Could not load carrier details.");
        }
        if (!cancelled) setData(json.data as DiligencePayload);
      })
      .catch((e: unknown) => {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Could not load carrier details.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [carrierCompanyId]);

  if (loading) {
    return <p className={`text-xs text-zinc-500 ${compact ? "mt-2" : "mt-3"}`}>Loading carrier details…</p>;
  }
  if (err) {
    return <p className={`text-xs text-red-700 ${compact ? "mt-2" : "mt-3"}`}>{err}</p>;
  }
  if (!data) return null;

  return (
    <div className={compact ? "mt-3 space-y-3" : "mt-4 space-y-4"}>
      <CarrierScorecard
        carrier={data.carrier}
        passport={data.passport}
        insurance={data.insurance}
        performance={data.performance}
      />
      {data.creditFile ? (
        <CreditFilePanel
          subjectCompanyId={carrierCompanyId}
          partyLabel="Carrier"
          file={data.creditFile}
          canMarkReviewed
        />
      ) : (
        <p className="text-[11px] text-zinc-500">
          Credit file links open when this carrier has a pending request on your load, or after you book together.
          Scorecard above shows compliance status and coverage without raw file URLs.
        </p>
      )}
    </div>
  );
}
