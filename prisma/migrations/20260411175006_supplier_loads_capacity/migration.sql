/*
  Warnings:

  - Added the required column `requestedPickupAt` to the `Load` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "SupplierKind" AS ENUM ('MILL', 'WHOLESALER', 'OTHER');

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "supplierKind" "SupplierKind";

-- AlterTable
ALTER TABLE "Load" ADD COLUMN     "extendedPosting" JSONB,
ADD COLUMN     "requestedPickupAt" TIMESTAMP(3);

UPDATE "Load" SET "requestedPickupAt" = "createdAt" WHERE "requestedPickupAt" IS NULL;

ALTER TABLE "Load" ALTER COLUMN "requestedPickupAt" SET NOT NULL;

-- CreateTable
CREATE TABLE "CapacityOffer" (
    "id" TEXT NOT NULL,
    "carrierCompanyId" TEXT NOT NULL,
    "originZip" TEXT NOT NULL,
    "originCity" TEXT,
    "originState" TEXT,
    "destinationZip" TEXT NOT NULL,
    "destinationCity" TEXT,
    "destinationState" TEXT,
    "equipmentType" TEXT NOT NULL,
    "askingRateUsd" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CapacityOffer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CapacityOffer_status_idx" ON "CapacityOffer"("status");

-- CreateIndex
CREATE INDEX "CapacityOffer_originZip_destinationZip_idx" ON "CapacityOffer"("originZip", "destinationZip");

-- AddForeignKey
ALTER TABLE "CapacityOffer" ADD CONSTRAINT "CapacityOffer_carrierCompanyId_fkey" FOREIGN KEY ("carrierCompanyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
