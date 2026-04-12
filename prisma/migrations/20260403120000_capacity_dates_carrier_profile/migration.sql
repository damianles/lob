-- AlterTable: Company carrier profile / owner-operator
ALTER TABLE "Company" ADD COLUMN "fleetTruckCount" INTEGER;
ALTER TABLE "Company" ADD COLUMN "fleetTrailerCount" INTEGER;
ALTER TABLE "Company" ADD COLUMN "trailerEquipmentTypes" TEXT;
ALTER TABLE "Company" ADD COLUMN "carrierProfileBlurb" TEXT;
ALTER TABLE "Company" ADD COLUMN "isOwnerOperator" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: CapacityOffer availability window
ALTER TABLE "CapacityOffer" ADD COLUMN "availableFrom" TIMESTAMP(3);
ALTER TABLE "CapacityOffer" ADD COLUMN "availableUntil" TIMESTAMP(3);

UPDATE "CapacityOffer" SET "availableFrom" = "createdAt" WHERE "availableFrom" IS NULL;
UPDATE "CapacityOffer" SET "availableUntil" = "availableFrom" + interval '5 days' WHERE "availableUntil" IS NULL;

ALTER TABLE "CapacityOffer" ALTER COLUMN "availableFrom" SET NOT NULL;
ALTER TABLE "CapacityOffer" ALTER COLUMN "availableUntil" SET NOT NULL;
ALTER TABLE "CapacityOffer" ALTER COLUMN "availableFrom" SET DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "CapacityOffer_availableUntil_idx" ON "CapacityOffer"("availableUntil");
