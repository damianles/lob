-- Cargo and auto liability limits on insurance (COI) documents for supplier scorecards.
ALTER TABLE "Document" ADD COLUMN "cargoCoverageUsd" INTEGER;
ALTER TABLE "Document" ADD COLUMN "autoLiabilityCoverageUsd" INTEGER;
