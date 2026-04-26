-- ====================================================================
-- Promote lumber spec to first-class Load columns + add LoadTemplate.
-- Mirrors the JSON shape from `Load.extendedPosting.lumber` so we can
-- index/filter without touching JSON. Existing rows are backfilled
-- below.
-- ====================================================================

ALTER TABLE "Load"
  ADD COLUMN     "lumberCategory"          TEXT,
  ADD COLUMN     "lumberSpecies"           TEXT,
  ADD COLUMN     "lumberGrade"             TEXT,
  ADD COLUMN     "lumberDryness"           TEXT,
  ADD COLUMN     "lumberTreatment"         TEXT,
  ADD COLUMN     "lumberPanelType"         TEXT,
  ADD COLUMN     "lumberNominalSize"       TEXT,
  ADD COLUMN     "lumberLengthFt"          DOUBLE PRECISION,
  ADD COLUMN     "lumberPieceCount"        INTEGER,
  ADD COLUMN     "lumberBundleCount"       INTEGER,
  ADD COLUMN     "lumberMbf"               DOUBLE PRECISION,
  ADD COLUMN     "lumberPackaging"         TEXT,
  ADD COLUMN     "lumberLoadingMethod"     TEXT,
  ADD COLUMN     "lumberFragile"           BOOLEAN,
  ADD COLUMN     "lumberWeatherSensitive"  BOOLEAN,
  ADD COLUMN     "lumberExportShipment"    BOOLEAN;

CREATE INDEX "Load_lumberSpecies_idx"   ON "Load"("lumberSpecies");
CREATE INDEX "Load_lumberPanelType_idx" ON "Load"("lumberPanelType");
CREATE INDEX "Load_lumberCategory_idx"  ON "Load"("lumberCategory");
CREATE INDEX "Load_originState_destinationState_requestedPickupAt_idx"
  ON "Load"("originState", "destinationState", "requestedPickupAt");

-- Backfill from existing extendedPosting.lumber JSON
UPDATE "Load"
SET
  "lumberCategory"         = "extendedPosting"->'lumber'->>'productCategory',
  "lumberSpecies"          = "extendedPosting"->'lumber'->>'species',
  "lumberGrade"            = "extendedPosting"->'lumber'->>'grade',
  "lumberDryness"          = "extendedPosting"->'lumber'->>'dryness',
  "lumberTreatment"        = "extendedPosting"->'lumber'->>'treatment',
  "lumberPanelType"        = "extendedPosting"->'lumber'->>'panelType',
  "lumberNominalSize"      = "extendedPosting"->'lumber'->>'nominalSize',
  "lumberLengthFt"         = NULLIF("extendedPosting"->'lumber'->>'lengthFt','')::double precision,
  "lumberPieceCount"       = NULLIF("extendedPosting"->'lumber'->>'pieceCount','')::integer,
  "lumberBundleCount"      = NULLIF("extendedPosting"->'lumber'->>'bundleCount','')::integer,
  "lumberMbf"              = NULLIF("extendedPosting"->'lumber'->>'mbf','')::double precision,
  "lumberPackaging"        = "extendedPosting"->'lumber'->>'packaging',
  "lumberLoadingMethod"    = "extendedPosting"->'lumber'->>'loadingMethod',
  "lumberFragile"          = NULLIF("extendedPosting"->'lumber'->>'fragile','')::boolean,
  "lumberWeatherSensitive" = NULLIF("extendedPosting"->'lumber'->>'weatherSensitive','')::boolean,
  "lumberExportShipment"   = NULLIF("extendedPosting"->'lumber'->>'exportShipment','')::boolean
WHERE "extendedPosting" IS NOT NULL
  AND ("extendedPosting" ? 'lumber');

-- ====================================================================
-- LoadTemplate: reusable post-load templates per shipper company.
-- ====================================================================

CREATE TABLE "LoadTemplate" (
  "id"               TEXT          NOT NULL,
  "companyId"        TEXT          NOT NULL,
  "createdByUserId"  TEXT          NOT NULL,
  "name"             TEXT          NOT NULL,
  "shortLabel"       TEXT,
  "originCity"       TEXT,
  "originState"      TEXT,
  "originZip"        TEXT,
  "destinationCity"  TEXT,
  "destinationState" TEXT,
  "destinationZip"   TEXT,
  "equipmentType"    TEXT,
  "weightLbs"        INTEGER,
  "isRush"           BOOLEAN       NOT NULL DEFAULT false,
  "isPrivate"        BOOLEAN       NOT NULL DEFAULT false,
  "defaultRateUsd"   DECIMAL(10,2),
  "defaultCurrency"  "OfferCurrency" NOT NULL DEFAULT 'USD',
  "notes"            TEXT,
  "lumberSpec"       JSONB,
  "createdAt"        TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3)  NOT NULL,

  CONSTRAINT "LoadTemplate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LoadTemplate_companyId_idx"      ON "LoadTemplate"("companyId");
CREATE INDEX "LoadTemplate_companyId_name_idx" ON "LoadTemplate"("companyId", "name");

ALTER TABLE "LoadTemplate"
  ADD CONSTRAINT "LoadTemplate_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LoadTemplate"
  ADD CONSTRAINT "LoadTemplate_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
