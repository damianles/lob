-- CreateEnum
CREATE TYPE "RateObservationSource" AS ENUM ('APP', 'IMPORT');

-- CreateTable
CREATE TABLE "LaneRateObservation" (
    "id" TEXT NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "originState" TEXT NOT NULL,
    "destState" TEXT NOT NULL,
    "originCityCanon" TEXT NOT NULL,
    "destCityCanon" TEXT NOT NULL,
    "originZip5" TEXT NOT NULL DEFAULT '',
    "destZip5" TEXT NOT NULL DEFAULT '',
    "equipmentNorm" TEXT NOT NULL,
    "rateUsd" DECIMAL(12,2) NOT NULL,
    "offerCurrency" "OfferCurrency" NOT NULL DEFAULT 'USD',
    "source" "RateObservationSource" NOT NULL DEFAULT 'APP',
    "loadId" TEXT,

    CONSTRAINT "LaneRateObservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LaneRateObservation_loadId_key" ON "LaneRateObservation"("loadId");

-- CreateIndex
CREATE INDEX "LaneRateObservation_observedAt_idx" ON "LaneRateObservation"("observedAt");

-- CreateIndex
CREATE INDEX "LaneRateObservation_originState_destState_idx" ON "LaneRateObservation"("originState", "destState");

-- CreateIndex
CREATE INDEX "LaneRateObservation_originState_destState_originCityCanon_d_idx" ON "LaneRateObservation"("originState", "destState", "originCityCanon", "destCityCanon");

-- AddForeignKey
ALTER TABLE "LaneRateObservation" ADD CONSTRAINT "LaneRateObservation_loadId_fkey" FOREIGN KEY ("loadId") REFERENCES "Load"("id") ON DELETE CASCADE ON UPDATE CASCADE;
