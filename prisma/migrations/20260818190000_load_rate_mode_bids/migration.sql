-- CreateEnum
CREATE TYPE "LoadRateMode" AS ENUM ('TAKE_IT', 'OPEN_BID');

-- CreateEnum
CREATE TYPE "LoadBidKind" AS ENUM ('BID', 'COUNTER');

-- CreateEnum
CREATE TYPE "LoadBidStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'WITHDRAWN', 'EXPIRED');

-- AlterTable
ALTER TABLE "Load" ADD COLUMN "rateMode" "LoadRateMode" NOT NULL DEFAULT 'TAKE_IT';
ALTER TABLE "Load" ADD COLUMN "allowCounterOffers" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Load" ADD COLUMN "bidWindowExpiresAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "LoadBid" (
    "id" TEXT NOT NULL,
    "loadId" TEXT NOT NULL,
    "carrierCompanyId" TEXT NOT NULL,
    "submittedByUserId" TEXT NOT NULL,
    "kind" "LoadBidKind" NOT NULL,
    "status" "LoadBidStatus" NOT NULL DEFAULT 'PENDING',
    "amountUsd" DECIMAL(10,2) NOT NULL,
    "currency" "OfferCurrency" NOT NULL,
    "note" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "reviewedAt" TIMESTAMP(3),
    "reviewedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoadBid_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Load_rateMode_status_idx" ON "Load"("rateMode", "status");
CREATE INDEX "Load_bidWindowExpiresAt_idx" ON "Load"("bidWindowExpiresAt");
CREATE INDEX "LoadBid_loadId_status_idx" ON "LoadBid"("loadId", "status");
CREATE INDEX "LoadBid_carrierCompanyId_status_idx" ON "LoadBid"("carrierCompanyId", "status");
CREATE INDEX "LoadBid_expiresAt_idx" ON "LoadBid"("expiresAt");
CREATE UNIQUE INDEX "LoadBid_one_pending_per_carrier" ON "LoadBid"("loadId", "carrierCompanyId") WHERE "status" = 'PENDING';

-- AddForeignKey
ALTER TABLE "LoadBid" ADD CONSTRAINT "LoadBid_loadId_fkey" FOREIGN KEY ("loadId") REFERENCES "Load"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LoadBid" ADD CONSTRAINT "LoadBid_carrierCompanyId_fkey" FOREIGN KEY ("carrierCompanyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LoadBid" ADD CONSTRAINT "LoadBid_submittedByUserId_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LoadBid" ADD CONSTRAINT "LoadBid_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
