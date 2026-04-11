import { z } from "zod";

export const createLoadSchema = z.object({
  originCity: z.string().min(2),
  originState: z.string().min(2).max(2),
  originZip: z.string().min(5).max(10),
  destinationCity: z.string().min(2),
  destinationState: z.string().min(2).max(2),
  destinationZip: z.string().min(5).max(10),
  weightLbs: z.number().int().positive(),
  equipmentType: z.string().min(2),
  isRush: z.boolean().default(false),
  isPrivate: z.boolean().default(false),
  offeredRateUsd: z.number().positive().optional(),
});

export const createBookingSchema = z.object({
  carrierCompanyId: z.string().min(1).optional(),
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

export const podUploadSchema = z.object({
  fileUrl: z.string().url(),
});

export const companyOnboardingSchema = z.object({
  legalName: z.string().min(2),
  userName: z.string().min(2).optional(),
  userEmail: z.string().email().optional(),
  dotNumber: z.string().min(2).optional(),
  mcNumber: z.string().min(2).optional(),
  carrierType: z.enum(["ASSET_BASED", "BROKER"]).optional(),
  role: z.enum(["SHIPPER", "DISPATCHER"]),
});

export const insuranceUploadSchema = z.object({
  fileUrl: z.string().url(),
  expiresAt: z.string().datetime(),
});

