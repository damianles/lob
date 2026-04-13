import { z } from "zod";

import { LUMBER_EQUIPMENT_CODES } from "@/lib/lumber-equipment";

export const createLoadSchema = z.object({
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
  offerCurrency: z.enum(["USD", "CAD"]).default("USD"),
  offeredRateUsd: z.number().positive(),
  extendedPosting: z.record(z.string(), z.unknown()).optional(),
  carrierVisibilityMode: z.enum(["OPEN", "TIER_ASSIGNED"]).default("OPEN"),
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
    if (d.carrierVisibilityMode === "TIER_ASSIGNED" && d.tierAssignments.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select at least one carrier in a tier when using tier-based visibility.",
        path: ["tierAssignments"],
      });
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

export const companyOnboardingSchema = z.object({
  legalName: z.string().min(2),
  userName: z.string().min(2).optional(),
  userEmail: z.string().email().optional(),
  dotNumber: z.string().min(2).optional(),
  mcNumber: z.string().min(2).optional(),
  carrierType: z.enum(["ASSET_BASED", "BROKER"]).optional(),
  role: z.enum(["SHIPPER", "DISPATCHER"]),
  supplierKind: z.enum(["MILL", "WHOLESALER", "OTHER"]).optional(),
});

export const insuranceUploadSchema = z.object({
  fileUrl: z.string().url(),
  expiresAt: z.string().datetime(),
});

