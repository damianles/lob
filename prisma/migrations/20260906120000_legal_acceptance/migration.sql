-- CreateEnum
CREATE TYPE "LegalDocumentKey" AS ENUM ('PLATFORM_TERMS', 'PRIVACY_POLICY', 'SUPPLIER_AGREEMENT', 'CARRIER_AGREEMENT');

-- CreateTable
CREATE TABLE "LegalAcceptance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT,
    "documentKey" "LegalDocumentKey" NOT NULL,
    "documentVersion" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "LegalAcceptance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LegalAcceptance_companyId_documentKey_idx" ON "LegalAcceptance"("companyId", "documentKey");

-- CreateIndex
CREATE INDEX "LegalAcceptance_documentKey_documentVersion_idx" ON "LegalAcceptance"("documentKey", "documentVersion");

-- CreateIndex
CREATE UNIQUE INDEX "LegalAcceptance_userId_documentKey_documentVersion_key" ON "LegalAcceptance"("userId", "documentKey", "documentVersion");

-- AddForeignKey
ALTER TABLE "LegalAcceptance" ADD CONSTRAINT "LegalAcceptance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalAcceptance" ADD CONSTRAINT "LegalAcceptance_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
