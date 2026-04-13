-- CreateEnum
CREATE TYPE "LoadCarrierVisibilityMode" AS ENUM ('OPEN', 'TIER_ASSIGNED');

-- AlterTable
ALTER TABLE "Load" ADD COLUMN "carrierVisibilityMode" "LoadCarrierVisibilityMode" NOT NULL DEFAULT 'OPEN';

-- CreateTable
CREATE TABLE "ShipperCarrierExclusion" (
    "id" TEXT NOT NULL,
    "shipperCompanyId" TEXT NOT NULL,
    "carrierCompanyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShipperCarrierExclusion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoadCarrierTier" (
    "id" TEXT NOT NULL,
    "loadId" TEXT NOT NULL,
    "carrierCompanyId" TEXT NOT NULL,
    "tier" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoadCarrierTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoadCarrierExclusion" (
    "id" TEXT NOT NULL,
    "loadId" TEXT NOT NULL,
    "carrierCompanyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoadCarrierExclusion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShipperCarrierExclusion_shipperCompanyId_carrierCompanyId_key" ON "ShipperCarrierExclusion"("shipperCompanyId", "carrierCompanyId");

-- CreateIndex
CREATE INDEX "ShipperCarrierExclusion_shipperCompanyId_idx" ON "ShipperCarrierExclusion"("shipperCompanyId");

-- CreateIndex
CREATE INDEX "ShipperCarrierExclusion_carrierCompanyId_idx" ON "ShipperCarrierExclusion"("carrierCompanyId");

-- CreateIndex
CREATE UNIQUE INDEX "LoadCarrierTier_loadId_carrierCompanyId_key" ON "LoadCarrierTier"("loadId", "carrierCompanyId");

-- CreateIndex
CREATE INDEX "LoadCarrierTier_loadId_idx" ON "LoadCarrierTier"("loadId");

-- CreateIndex
CREATE UNIQUE INDEX "LoadCarrierExclusion_loadId_carrierCompanyId_key" ON "LoadCarrierExclusion"("loadId", "carrierCompanyId");

-- CreateIndex
CREATE INDEX "LoadCarrierExclusion_loadId_idx" ON "LoadCarrierExclusion"("loadId");

-- AddForeignKey
ALTER TABLE "ShipperCarrierExclusion" ADD CONSTRAINT "ShipperCarrierExclusion_shipperCompanyId_fkey" FOREIGN KEY ("shipperCompanyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipperCarrierExclusion" ADD CONSTRAINT "ShipperCarrierExclusion_carrierCompanyId_fkey" FOREIGN KEY ("carrierCompanyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoadCarrierTier" ADD CONSTRAINT "LoadCarrierTier_loadId_fkey" FOREIGN KEY ("loadId") REFERENCES "Load"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoadCarrierTier" ADD CONSTRAINT "LoadCarrierTier_carrierCompanyId_fkey" FOREIGN KEY ("carrierCompanyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoadCarrierExclusion" ADD CONSTRAINT "LoadCarrierExclusion_loadId_fkey" FOREIGN KEY ("loadId") REFERENCES "Load"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoadCarrierExclusion" ADD CONSTRAINT "LoadCarrierExclusion_carrierCompanyId_fkey" FOREIGN KEY ("carrierCompanyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
