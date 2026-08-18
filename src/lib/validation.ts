import { z } from "zod";

import { LUMBER_EQUIPMENT_CODES } from "@/lib/lumber-equipment";
import { TAKE_IT_LABEL } from "@/lib/rate-mode";

export const createLoadSchema = z.object({
  /** Shipper-supplied idempotency key (TMS load id, PO, mill ticket). */
  externalRef: z.string().trim().max(120).optional(),
  originCity: z.string().min(2),
  originState: z.string().min(2).max(2),
  /** US state or CA province code (2 letters). */
  originZip: z.string().min(3).max(12),
  destinationCity: z.string().min(2),
  destinationState: z.string().min(2).max(2),
  destinationZip: z.string().min(3).max(12),
  weightLbs: z.number().int().positive(),
  equipmentType: z
    .string()
    .min(2)
    .refine((s) => LUMBER_EQUIPMENT_CODES.has(s) || s.length >= 3, "Use a lumber equipment code (SB, Tri, MX, Tan, CW) or a legacy type."),
  isRush: z.boolean().default(false),
  isPrivate: z.boolean().default(false),
  /** ISO datetime or YYYY-MM-DD (stored as noon UTC). */
  requestedPickupAt: z.string().min(8),
  /** ISO datetime or YYYY-MM-DD — expected delivery. */
  requestedDeliveryAt: z.string().min(8).optional(),
  offerCurrency: z.enum(["USD", "CAD"]).default("CAD"),
  offeredRateUsd: z.number().positive().optional(),
  /**
   * TAKE_IT = posted Firm Rate. OPEN_BID = carriers bid.
   */
  rateMode: z.enum(["TAKE_IT", "OPEN_BID"]).default("TAKE_IT"),
  /** TAKE_IT only: allow carriers to counter the posted rate. */
  allowCounterOffers: z.boolean().default(false),
  /**
   * OPEN_BID window length in hours (1–336). Ignored for Firm Rate.
   * Use 0 with bidUntilPickup to close at pickup instead.
   */
  bidWindowHours: z.number().int().min(0).max(336).optional(),
  bidUntilPickup: z.boolean().default(false),
  extendedPosting: z.record(z.string(), z.unknown()).optional(),
  carrierVisibilityMode: z.enum(["OPEN", "TIER_ASSIGNED"]).default("OPEN"),
  /**
   * Which saved company-level tier groups (1–3) may see this load.
   * Server expands membership from ShipperCarrierTier.
   */
  visibleTiers: z.array(z.number().int().min(1).max(3)).default([]),
  /** Legacy per-load assignments; used when visibleTiers is empty. */
  tierAssignments: z
    .array(
      z.object({
        carrierCompanyId: z.string().min(1),
        tier: z.number().int().min(1).max(5),
      }),
    )
    .default([]),
  perLoadExcludedCarrierIds: z.array(z.string().min(1)).default([]),
  /**
   * Staged tier release (standard loads only). When true, T2/T3 unlock after hour windows.
   */
  tierStagingEnabled: z.boolean().default(false),
  tier1ExclusiveHours: z.number().int().min(1).max(168).optional(),
  tier2ExclusiveHours: z.number().int().min(1).max(168).optional(),
})
  .superRefine((d, ctx) => {
    if (d.carrierVisibilityMode === "TIER_ASSIGNED") {
      const hasGroups = d.visibleTiers.length > 0;
      const hasLegacy = d.tierAssignments.length > 0;
      if (!hasGroups && !hasLegacy) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Select at least one tier group (T1–T3) when using tier-based visibility.",
          path: ["visibleTiers"],
        });
      }
    }
    if (d.tierStagingEnabled && d.isRush) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Rush loads cannot use staged tier release — they go to selected tiers immediately.",
        path: ["tierStagingEnabled"],
      });
    }
    if (d.tierStagingEnabled && d.carrierVisibilityMode !== "TIER_ASSIGNED") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Staged release only applies when Carrier Visibility is Tiers only.",
        path: ["tierStagingEnabled"],
      });
    }
    if (d.equipmentType === "SPEC") {
      const ext = d.extendedPosting as { equipmentDetail?: unknown } | undefined;
      const detail = typeof ext?.equipmentDetail === "string" ? ext.equipmentDetail.trim() : "";
      if (!detail) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Specialized equipment details are required.",
          path: ["extendedPosting"],
        });
      }
    }
    if (d.requestedDeliveryAt && d.requestedPickupAt) {
      const pu = Date.parse(d.requestedPickupAt.length === 10 ? `${d.requestedPickupAt}T12:00:00.000Z` : d.requestedPickupAt);
      const del = Date.parse(
        d.requestedDeliveryAt.length === 10 ? `${d.requestedDeliveryAt}T12:00:00.000Z` : d.requestedDeliveryAt,
      );
      if (Number.isFinite(pu) && Number.isFinite(del) && del < pu) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Delivery date cannot be before pickup date.",
          path: ["requestedDeliveryAt"],
        });
      }
    }
    if (d.rateMode === "TAKE_IT") {
      if (d.offeredRateUsd == null || d.offeredRateUsd <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${TAKE_IT_LABEL} posts need a posted rate — this is the amount you pay.`,
          path: ["offeredRateUsd"],
        });
      }
    }
    if (d.rateMode === "OPEN_BID") {
      if (d.allowCounterOffers) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Allow counters only applies to ${TAKE_IT_LABEL} posts.`,
          path: ["allowCounterOffers"],
        });
      }
      if (!d.bidUntilPickup && (!d.bidWindowHours || d.bidWindowHours < 1)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Set how long bidding stays open, or choose until pickup.",
          path: ["bidWindowHours"],
        });
      }
    }
  });

export const updateLoadSchema = z
  .object({
    originCity: z.string().min(2).optional(),
    originState: z.string().min(2).max(2).optional(),
    originZip: z.string().min(3).max(12).optional(),
    destinationCity: z.string().min(2).optional(),
    destinationState: z.string().min(2).max(2).optional(),
    destinationZip: z.string().min(3).max(12).optional(),
    weightLbs: z.number().int().positive().optional(),
    equipmentType: z.string().min(2).optional(),
    isRush: z.boolean().optional(),
    requestedPickupAt: z.string().min(8).optional(),
    requestedDeliveryAt: z.string().min(8).nullable().optional(),
    offerCurrency: z.enum(["USD", "CAD"]).optional(),
    offeredRateUsd: z.number().positive().optional(),
    rateMode: z.enum(["TAKE_IT", "OPEN_BID"]).optional(),
    allowCounterOffers: z.boolean().optional(),
    extendedPosting: z.record(z.string(), z.unknown()).optional(),
    changeSummary: z.string().trim().max(500).optional(),
  })
  .superRefine((d, ctx) => {
    if (d.requestedDeliveryAt && d.requestedPickupAt) {
      const pu = Date.parse(d.requestedPickupAt.length === 10 ? `${d.requestedPickupAt}T12:00:00.000Z` : d.requestedPickupAt);
      const del = Date.parse(
        d.requestedDeliveryAt.length === 10 ? `${d.requestedDeliveryAt}T12:00:00.000Z` : d.requestedDeliveryAt,
      );
      if (Number.isFinite(pu) && Number.isFinite(del) && del < pu) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Delivery date cannot be before pickup date.",
          path: ["requestedDeliveryAt"],
        });
      }
    }
  });

export const createDateChangeRequestSchema = z
  .object({
    proposedPickupAt: z.string().min(8).optional(),
    proposedDeliveryAt: z.string().min(8).optional(),
    note: z.string().trim().max(500).optional(),
  })
  .refine((d) => Boolean(d.proposedPickupAt || d.proposedDeliveryAt), {
    message: "Propose at least a pickup or delivery date.",
  });

export const reviewDateChangeRequestSchema = z.object({
  decision: z.enum(["APPROVE", "REJECT"]),
  reviewNote: z.string().trim().max(500).optional(),
});

export const createBookingSchema = z.object({
  carrierCompanyId: z.string().min(1).optional(),
  agreedCurrency: z.enum(["USD", "CAD"]).optional(),
  agreedRateUsd: z.number().positive().optional(),
});

export const createLoadBidSchema = z.object({
  amountUsd: z.number().positive(),
  note: z.string().trim().max(500).optional(),
  /** Hours this bid/counter stays open (1–168). Defaults to remaining bid window or 24h. */
  expiresInHours: z.number().int().min(1).max(168).optional(),
});

export const reviewLoadBidSchema = z.object({
  decision: z.enum(["ACCEPT", "DECLINE"]),
});

export const createDispatchSchema = z.object({
  assignedByUserId: z.string().min(1).optional(),
  driverName: z.string().min(2),
  driverPhone: z.string().optional(),
  driverEmail: z.string().email().optional(),
  expiresInHours: z.number().int().positive().max(72).default(48),
  notes: z.string().trim().max(800).optional(),
  include: z
    .object({
      lane: z.boolean().optional(),
      dates: z.boolean().optional(),
      equipment: z.boolean().optional(),
      weight: z.boolean().optional(),
      lumber: z.boolean().optional(),
      shipperName: z.boolean().optional(),
      pickupCode: z.boolean().optional(),
      carrierName: z.boolean().optional(),
    })
    .optional(),
});

export const podUploadSchema = z
  .object({
    fileUrl: z.string().url().optional(),
    /** Receiver confirms delivery in-app without uploading a POD file. */
    receiverAcknowledged: z.boolean().optional(),
  })
  .refine((d) => Boolean(d.fileUrl) || d.receiverAcknowledged === true, {
    message: "Provide a POD file URL or set receiverAcknowledged to true.",
  });

export const companyOnboardingSchema = z
  .object({
    legalName: z.string().min(2),
    /** 2–3 letter tracking code for LOB load refs (suppliers). */
    acronym: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9]{2,3}$/, "Use 2–3 letters or digits")
      .optional(),
    userName: z.string().min(2).optional(),
    userEmail: z.string().email().optional(),
    dotNumber: z.string().min(2).optional(),
    mcNumber: z.string().min(2).optional(),
    carrierType: z.enum(["ASSET_BASED", "BROKER"]).optional(),
    isOwnerOperator: z.boolean().optional(),
    role: z.enum(["SHIPPER", "DISPATCHER"]),
    supplierKind: z.enum(["MILL", "WHOLESALER", "OTHER"]).optional(),
  })
  .superRefine((d, ctx) => {
    if (d.role === "SHIPPER" && !d.acronym) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Company acronym (2–3 letters) is required for suppliers.",
        path: ["acronym"],
      });
    }
  });

export const insuranceUploadSchema = z.object({
  fileUrl: z.string().url(),
  expiresAt: z.string().datetime(),
});

