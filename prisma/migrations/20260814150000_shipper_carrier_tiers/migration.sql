-- CreateTable
CREATE TABLE "ShipperCarrierTier" (
    "id" TEXT NOT NULL,
    "shipperCompanyId" TEXT NOT NULL,
    "carrierCompanyId" TEXT NOT NULL,
    "tier" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShipperCarrierTier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShipperCarrierTier_shipperCompanyId_tier_idx" ON "ShipperCarrierTier"("shipperCompanyId", "tier");

-- CreateIndex
CREATE INDEX "ShipperCarrierTier_carrierCompanyId_idx" ON "ShipperCarrierTier"("carrierCompanyId");

-- CreateIndex
CREATE UNIQUE INDEX "ShipperCarrierTier_shipperCompanyId_carrierCompanyId_key" ON "ShipperCarrierTier"("shipperCompanyId", "carrierCompanyId");

-- AddForeignKey
ALTER TABLE "ShipperCarrierTier" ADD CONSTRAINT "ShipperCarrierTier_shipperCompanyId_fkey" FOREIGN KEY ("shipperCompanyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipperCarrierTier" ADD CONSTRAINT "ShipperCarrierTier_carrierCompanyId_fkey" FOREIGN KEY ("carrierCompanyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
