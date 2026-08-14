-- AlterTable
ALTER TABLE "Load" ADD COLUMN IF NOT EXISTS "tierStagingEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Load" ADD COLUMN IF NOT EXISTS "tier1ExclusiveHours" INTEGER;
ALTER TABLE "Load" ADD COLUMN IF NOT EXISTS "tier2ExclusiveHours" INTEGER;

-- AlterTable
ALTER TABLE "LoadCarrierTier" ADD COLUMN IF NOT EXISTS "unlockAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LoadCarrierTier_unlockAt_idx" ON "LoadCarrierTier"("unlockAt");

-- CreateEnum (idempotent-ish via DO blocks)
DO $$ BEGIN
  CREATE TYPE "LoadNoticeChannel" AS ENUM ('IN_APP', 'EMAIL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "LoadNoticeStatus" AS ENUM ('PENDING', 'DELIVERED', 'SKIPPED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "DateChangeRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "LoadChangeNotice" (
    "id" TEXT NOT NULL,
    "loadId" TEXT NOT NULL,
    "carrierCompanyId" TEXT NOT NULL,
    "recipientUserId" TEXT,
    "recipientEmail" TEXT,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "changes" JSONB,
    "channel" "LoadNoticeChannel" NOT NULL DEFAULT 'EMAIL',
    "status" "LoadNoticeStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoadChangeNotice_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "LoadChangeNotice_loadId_createdAt_idx" ON "LoadChangeNotice"("loadId", "createdAt");
CREATE INDEX IF NOT EXISTS "LoadChangeNotice_carrierCompanyId_status_idx" ON "LoadChangeNotice"("carrierCompanyId", "status");
CREATE INDEX IF NOT EXISTS "LoadChangeNotice_recipientUserId_status_idx" ON "LoadChangeNotice"("recipientUserId", "status");

DO $$ BEGIN
  ALTER TABLE "LoadChangeNotice" ADD CONSTRAINT "LoadChangeNotice_loadId_fkey" FOREIGN KEY ("loadId") REFERENCES "Load"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "LoadChangeNotice" ADD CONSTRAINT "LoadChangeNotice_carrierCompanyId_fkey" FOREIGN KEY ("carrierCompanyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "LoadChangeNotice" ADD CONSTRAINT "LoadChangeNotice_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "LoadDateChangeRequest" (
    "id" TEXT NOT NULL,
    "loadId" TEXT NOT NULL,
    "proposedByUserId" TEXT NOT NULL,
    "proposedByCompanyId" TEXT NOT NULL,
    "proposedPickupAt" TIMESTAMP(3),
    "proposedDeliveryAt" TIMESTAMP(3),
    "note" TEXT,
    "status" "DateChangeRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoadDateChangeRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "LoadDateChangeRequest_loadId_status_idx" ON "LoadDateChangeRequest"("loadId", "status");
CREATE INDEX IF NOT EXISTS "LoadDateChangeRequest_proposedByCompanyId_status_idx" ON "LoadDateChangeRequest"("proposedByCompanyId", "status");

DO $$ BEGIN
  ALTER TABLE "LoadDateChangeRequest" ADD CONSTRAINT "LoadDateChangeRequest_loadId_fkey" FOREIGN KEY ("loadId") REFERENCES "Load"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "LoadDateChangeRequest" ADD CONSTRAINT "LoadDateChangeRequest_proposedByUserId_fkey" FOREIGN KEY ("proposedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "LoadDateChangeRequest" ADD CONSTRAINT "LoadDateChangeRequest_proposedByCompanyId_fkey" FOREIGN KEY ("proposedByCompanyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "LoadDateChangeRequest" ADD CONSTRAINT "LoadDateChangeRequest_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
