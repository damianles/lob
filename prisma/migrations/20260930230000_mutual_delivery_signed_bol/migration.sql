-- Mutual delivery close + carrier signed BOL on dispatch link
ALTER TABLE "DispatchLink" ADD COLUMN IF NOT EXISTS "supplierDeliveredAt" TIMESTAMP(3);
ALTER TABLE "DispatchLink" ADD COLUMN IF NOT EXISTS "signedBolFileUrl" TEXT;
ALTER TABLE "DispatchLink" ADD COLUMN IF NOT EXISTS "signedBolUploadedAt" TIMESTAMP(3);
