import { z } from "zod";

import { LUMBER_EQUIPMENT_CODES } from "@/lib/lumber-equipment";

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
  offeredRateUsd: z.number().positive(),
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
  });

export const createBookingSchema = z.object({
  carrierCompanyId: z.string().min(1).optional(),
  agreedCurrency: z.enum(["USD", "CAD"]).optional(),
  agreedRateUsd: z.number().positive(),
});

export const createDispatchSchema = z.object({
  assignedByUserId: z.string().min(1).optional(),
  driverName: z.string().min(2),
  driverPhone: z.string().optional(),
  driverEmail: z.string().email().optional(),
  expiresInHours: z.number().int().positive().max(72).default(48),
});

export const pickupConfirmSchema = z.object({
  pickupCode: z.string().min(4),
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

