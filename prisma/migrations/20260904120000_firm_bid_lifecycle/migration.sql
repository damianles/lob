-- Firm Rate 7-day grace / Open bid 72h cycles / posted-lane analytics

ALTER TYPE "LoadStatus" ADD VALUE IF NOT EXISTS 'NEEDS_REPOST';
ALTER TYPE "LoadStatus" ADD VALUE IF NOT EXISTS 'UNLISTED';

ALTER TYPE "RateObservationSource" ADD VALUE IF NOT EXISTS 'POSTED';
ALTER TYPE "RateObservationSource" ADD VALUE IF NOT EXISTS 'BOOKED';

DO $$ BEGIN
  CREATE TYPE "PostedLaneOutcome" AS ENUM ('OPEN', 'BOOKED', 'DECLINED_REPOST', 'BID_CYCLE_REMOVED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "Load"
  ADD COLUMN IF NOT EXISTS "bidCycleCount" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "needsRepostAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Load_shipperCompanyId_status_idx" ON "Load"("shipperCompanyId", "status");

ALTER TABLE "LaneRateObservation"
  ADD COLUMN IF NOT EXISTS "bookedRateUsd" DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS "bookedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "outcome" "PostedLaneOutcome" NOT NULL DEFAULT 'OPEN';

CREATE INDEX IF NOT EXISTS "LaneRateObservation_outcome_observedAt_idx" ON "LaneRateObservation"("outcome", "observedAt");
CREATE INDEX IF NOT EXISTS "LaneRateObservation_source_observedAt_idx" ON "LaneRateObservation"("source", "observedAt");

CREATE TABLE IF NOT EXISTS "ShipperLoadAlert" (
  "id" TEXT NOT NULL,
  "loadId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "recipientUserId" TEXT,
  "kind" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "channel" "LoadNoticeChannel" NOT NULL DEFAULT 'IN_APP',
  "status" "LoadNoticeStatus" NOT NULL DEFAULT 'PENDING',
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ShipperLoadAlert_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ShipperLoadAlert_companyId_status_createdAt_idx" ON "ShipperLoadAlert"("companyId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "ShipperLoadAlert_loadId_idx" ON "ShipperLoadAlert"("loadId");
CREATE INDEX IF NOT EXISTS "ShipperLoadAlert_recipientUserId_status_idx" ON "ShipperLoadAlert"("recipientUserId", "status");

DO $$ BEGIN
  ALTER TABLE "ShipperLoadAlert" ADD CONSTRAINT "ShipperLoadAlert_loadId_fkey" FOREIGN KEY ("loadId") REFERENCES "Load"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "ShipperLoadAlert" ADD CONSTRAINT "ShipperLoadAlert_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "ShipperLoadAlert" ADD CONSTRAINT "ShipperLoadAlert_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
