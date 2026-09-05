-- CreateEnum
CREATE TYPE "CapacityInterestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'WITHDRAWN', 'EXPIRED');

-- CreateTable
CREATE TABLE "CapacityInterest" (
    "id" TEXT NOT NULL,
    "capacityOfferId" TEXT NOT NULL,
    "loadId" TEXT NOT NULL,
    "shipperCompanyId" TEXT NOT NULL,
    "carrierCompanyId" TEXT NOT NULL,
    "status" "CapacityInterestStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "reviewedAt" TIMESTAMP(3),
    "reviewedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CapacityInterest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CapacityInterest_carrierCompanyId_status_idx" ON "CapacityInterest"("carrierCompanyId", "status");

-- CreateIndex
CREATE INDEX "CapacityInterest_shipperCompanyId_status_idx" ON "CapacityInterest"("shipperCompanyId", "status");

-- CreateIndex
CREATE INDEX "CapacityInterest_loadId_status_idx" ON "CapacityInterest"("loadId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CapacityInterest_capacityOfferId_loadId_key" ON "CapacityInterest"("capacityOfferId", "loadId");

-- AddForeignKey
ALTER TABLE "CapacityInterest" ADD CONSTRAINT "CapacityInterest_capacityOfferId_fkey" FOREIGN KEY ("capacityOfferId") REFERENCES "CapacityOffer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapacityInterest" ADD CONSTRAINT "CapacityInterest_loadId_fkey" FOREIGN KEY ("loadId") REFERENCES "Load"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapacityInterest" ADD CONSTRAINT "CapacityInterest_shipperCompanyId_fkey" FOREIGN KEY ("shipperCompanyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapacityInterest" ADD CONSTRAINT "CapacityInterest_carrierCompanyId_fkey" FOREIGN KEY ("carrierCompanyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapacityInterest" ADD CONSTRAINT "CapacityInterest_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapacityInterest" ADD CONSTRAINT "CapacityInterest_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
