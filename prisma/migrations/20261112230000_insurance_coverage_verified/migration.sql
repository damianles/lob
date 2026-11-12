-- Admin human confirmation that COI file limits match carrier-entered coverage amounts.
ALTER TABLE "Company" ADD COLUMN "insuranceCoverageVerifiedAt" TIMESTAMP(3);
