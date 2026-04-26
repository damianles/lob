-- ====================================================================
-- SavedLane — address-only lane book for shippers.
--
-- Lighter than LoadTemplate: just origin + destination + optional yard /
-- phone. Lets mills click a lane to fill the route fields and edit the
-- rest fresh (product, rate, dates).
--
-- useCount + lastUsedAt let the picker float frequently-used lanes to
-- the top.
-- ====================================================================

CREATE TABLE "SavedLane" (
  "id"                 TEXT PRIMARY KEY,
  "companyId"          TEXT NOT NULL REFERENCES "Company"("id") ON DELETE CASCADE,
  "createdByUserId"    TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
  "label"              TEXT,

  "originCity"         TEXT NOT NULL,
  "originState"        TEXT NOT NULL,
  "originZip"          TEXT NOT NULL,
  "originAddress"      TEXT,
  "originPhone"        TEXT,

  "destinationCity"    TEXT NOT NULL,
  "destinationState"   TEXT NOT NULL,
  "destinationZip"     TEXT NOT NULL,
  "destinationAddress" TEXT,
  "destinationPhone"   TEXT,

  "useCount"           INTEGER NOT NULL DEFAULT 0,
  "lastUsedAt"         TIMESTAMP(3),

  "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "SavedLane_companyId_lastUsedAt_idx" ON "SavedLane" ("companyId", "lastUsedAt" DESC);
CREATE INDEX "SavedLane_companyId_useCount_idx" ON "SavedLane" ("companyId", "useCount" DESC);
