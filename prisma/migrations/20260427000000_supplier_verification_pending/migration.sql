-- Re-validation for cutover: all Canadian lumber suppliers require admin approval
-- to post loads (see /admin/suppliers). Seed re-approves the demo "North Ridge Lumber" company.
UPDATE "Company" SET "verificationStatus" = 'PENDING' WHERE "supplierKind" IS NOT NULL AND "carrierType" IS NULL;
