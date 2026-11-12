-- Carrier driver contacts for paperwork reuse (email / text from booked load).
CREATE TABLE "CarrierDriver" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CarrierDriver_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CarrierDriver_companyId_lastUsedAt_idx" ON "CarrierDriver"("companyId", "lastUsedAt");
CREATE INDEX "CarrierDriver_companyId_name_idx" ON "CarrierDriver"("companyId", "name");

ALTER TABLE "CarrierDriver" ADD CONSTRAINT "CarrierDriver_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
