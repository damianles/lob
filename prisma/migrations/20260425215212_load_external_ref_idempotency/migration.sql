-- ====================================================================
-- Load.externalRef: shipper-supplied idempotency key (TMS load id, mill
-- ticket, PO, etc.) Optional, but unique per shipper company when set.
--
-- Postgres treats NULLs as distinct in unique constraints, so multiple
-- legacy rows without an externalRef remain valid.
--
-- Also adds (shipperCompanyId, createdAt) index — feeds the
-- "Recent posts" repost picker on the supplier post form.
-- ====================================================================

ALTER TABLE "Load" ADD COLUMN "externalRef" TEXT;

CREATE UNIQUE INDEX "Load_shipper_externalRef_unique"
  ON "Load"("shipperCompanyId", "externalRef");

CREATE INDEX "Load_shipperCompanyId_createdAt_idx"
  ON "Load"("shipperCompanyId", "createdAt");
