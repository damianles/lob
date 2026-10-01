-- Paperwork: dual US/CA region, remittance email, broker attestation
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "remittanceEmail" TEXT;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "authorityRegion" TEXT;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "caBusinessNumber" TEXT;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "caSafetyNumber" TEXT;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "caSafetyProvince" VARCHAR(2);
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "brokerAttestedAt" TIMESTAMP(3);
