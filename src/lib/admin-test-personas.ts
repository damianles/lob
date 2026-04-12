/** Seed companies from `prisma/seed.ts` — used to attach an admin tester to real rows. */
export const SEED_SHIPPER_COMPANY_NAME = "North Ridge Lumber";
export const SEED_CARRIER_COMPANY_NAME = "Blue Ox Transport";

/** When true, auto-admin emails keep shipper/carrier test personas (see sync-clerk-user). */
export function isAdminPersonaSwitchEnabled(): boolean {
  return process.env.LOB_ALLOW_ADMIN_PERSONA_SWITCH === "true";
}
