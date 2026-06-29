/** Seed companies from `prisma/seed.ts` — used to attach an admin tester to real rows. */
export const SEED_SHIPPER_COMPANY_NAME = "North Ridge Lumber";
export const SEED_CARRIER_COMPANY_NAME = "Blue Ox Transport";

/** When true, auto-admin emails keep shipper/carrier test personas (see sync-clerk-user). */
export function isAdminPersonaSwitchEnabled(): boolean {
  if (
    process.env.VERCEL_ENV === "production" &&
    process.env.LOB_ALLOW_PREVIEW_ADMIN_TOOLS !== "true"
  ) {
    return false;
  }
  return process.env.LOB_ALLOW_ADMIN_PERSONA_SWITCH === "true";
}
