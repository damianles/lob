-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SHIPPER', 'DISPATCHER', 'DRIVER', 'ADMIN');

-- CreateEnum
CREATE TYPE "CarrierType" AS ENUM ('ASSET_BASED', 'BROKER');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "LoadStatus" AS ENUM ('POSTED', 'BOOKED', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "IncidentType" AS ENUM ('DROPPED_LOAD', 'NO_PICKUP', 'NON_RESPONSIVE');

-- CreateEnum
CREATE TYPE "DispatchLinkStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'COMPLETED');

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "dotNumber" TEXT,
    "mcNumber" TEXT,
    "carrierType" "CarrierType",
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "reliabilityScore" INTEGER NOT NULL DEFAULT 100,
    "factoringEligible" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "authProviderId" TEXT,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "companyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Load" (
    "id" TEXT NOT NULL,
    "referenceNumber" TEXT NOT NULL,
    "originCity" TEXT NOT NULL,
    "originState" TEXT NOT NULL,
    "originZip" TEXT NOT NULL,
    "destinationCity" TEXT NOT NULL,
    "destinationState" TEXT NOT NULL,
    "destinationZip" TEXT NOT NULL,
    "weightLbs" INTEGER NOT NULL,
    "equipmentType" TEXT NOT NULL,
    "isRush" BOOLEAN NOT NULL DEFAULT false,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "status" "LoadStatus" NOT NULL DEFAULT 'POSTED',
    "offeredRateUsd" DECIMAL(10,2),
    "marketRateUsd" DECIMAL(10,2),
    "finalCostUsd" DECIMAL(10,2),
    "uniquePickupCode" TEXT,
    "shipperCompanyId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Load_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "loadId" TEXT NOT NULL,
    "carrierCompanyId" TEXT NOT NULL,
    "agreedRateUsd" DECIMAL(10,2) NOT NULL,
    "bookedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DispatchLink" (
    "id" TEXT NOT NULL,
    "loadId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "driverName" TEXT NOT NULL,
    "driverPhone" TEXT,
    "driverEmail" TEXT,
    "assignedByUserId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" "DispatchLinkStatus" NOT NULL DEFAULT 'ACTIVE',
    "pickupConfirmedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DispatchLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "dispatchLinkId" TEXT,
    "kind" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL,
    "loadId" TEXT NOT NULL,
    "reportedByCompanyId" TEXT NOT NULL,
    "targetCompanyId" TEXT NOT NULL,
    "type" "IncidentType" NOT NULL,
    "note" TEXT,
    "scoreDelta" INTEGER NOT NULL DEFAULT -10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreferredLane" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "originZip" TEXT NOT NULL,
    "destinationZip" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PreferredLane_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmptyMileSetting" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "rateUsdPerMile" DECIMAL(8,2) NOT NULL,
    "maxEmptyMiles" INTEGER NOT NULL DEFAULT 150,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmptyMileSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_legalName_key" ON "Company"("legalName");

-- CreateIndex
CREATE UNIQUE INDEX "Company_dotNumber_key" ON "Company"("dotNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Company_mcNumber_key" ON "Company"("mcNumber");

-- CreateIndex
CREATE UNIQUE INDEX "User_authProviderId_key" ON "User"("authProviderId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Load_referenceNumber_key" ON "Load"("referenceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_loadId_key" ON "Booking"("loadId");

-- CreateIndex
CREATE UNIQUE INDEX "DispatchLink_loadId_key" ON "DispatchLink"("loadId");

-- CreateIndex
CREATE UNIQUE INDEX "DispatchLink_token_key" ON "DispatchLink"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Document_dispatchLinkId_key" ON "Document"("dispatchLinkId");

-- CreateIndex
CREATE UNIQUE INDEX "PreferredLane_companyId_originZip_destinationZip_key" ON "PreferredLane"("companyId", "originZip", "destinationZip");

-- CreateIndex
CREATE UNIQUE INDEX "EmptyMileSetting_companyId_key" ON "EmptyMileSetting"("companyId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Load" ADD CONSTRAINT "Load_shipperCompanyId_fkey" FOREIGN KEY ("shipperCompanyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Load" ADD CONSTRAINT "Load_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_loadId_fkey" FOREIGN KEY ("loadId") REFERENCES "Load"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_carrierCompanyId_fkey" FOREIGN KEY ("carrierCompanyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchLink" ADD CONSTRAINT "DispatchLink_loadId_fkey" FOREIGN KEY ("loadId") REFERENCES "Load"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchLink" ADD CONSTRAINT "DispatchLink_assignedByUserId_fkey" FOREIGN KEY ("assignedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_dispatchLinkId_fkey" FOREIGN KEY ("dispatchLinkId") REFERENCES "DispatchLink"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_loadId_fkey" FOREIGN KEY ("loadId") REFERENCES "Load"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_reportedByCompanyId_fkey" FOREIGN KEY ("reportedByCompanyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_targetCompanyId_fkey" FOREIGN KEY ("targetCompanyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreferredLane" ADD CONSTRAINT "PreferredLane_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmptyMileSetting" ADD CONSTRAINT "EmptyMileSetting_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
