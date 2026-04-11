import { IncidentType } from "@prisma/client";

export const carrierRejectionReasons = [
  "Invalid or unverifiable DOT/MC registration",
  "Insurance expired, invalid, or limits below requirement",
  "Safety rating unacceptable or unresolved federal/state violations",
  "Prior confirmed double-brokering behavior",
  "Fraud indicators in onboarding documents",
  "Mismatched legal entity information across submissions",
  "High unresolved claims/disputes from verified shippers",
  "Repeated communication failures during onboarding",
  "Watchlist/sanctions or prohibited jurisdiction flags",
  "Carrier profile incomplete after reminder window",
] as const;

export const reapplicationPolicy = {
  cooldownDays: 30,
  maxReapplicationsPerYear: 2,
  requiresEvidenceOfCorrection: true,
  permanentBanReasons: [
    "Confirmed double-brokering",
    "Fraudulent document submission",
    "Identity impersonation",
  ],
};

export const reliabilityDeductions: Record<IncidentType, number> = {
  DROPPED_LOAD: 15,
  NO_PICKUP: 20,
  NON_RESPONSIVE: 10,
};

export const reliabilityPolicy = {
  startingScore: 100,
  rushEligibilityMinimum: 70,
  floor: 0,
  ceiling: 100,
  monthlyRecoveryCap: 5,
  overrides: {
    canApplyManualDeductionRoles: ["ADMIN"],
    canReverseDeductionRoles: ["ADMIN"],
    requiresReasonText: true,
  },
} as const;

