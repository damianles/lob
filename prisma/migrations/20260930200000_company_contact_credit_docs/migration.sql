-- AlterTable
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "creditDocsVerifiedAt" TIMESTAMP(3);
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "businessPhone" TEXT;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "billingAddress" TEXT;
