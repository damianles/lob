-- =============================================================================
-- LOB: wipe ONLY our app tables + Prisma history in schema "public"
-- =============================================================================
-- Safe for: Supabase projects where you have no production data to keep.
-- Does NOT touch: auth, storage, or other Supabase-managed schemas.
--
-- After running this in Supabase → SQL Editor → Run:
--   cd web && npm run db:deploy
-- Optional seed:
--   npm run db:seed
-- =============================================================================

DROP TABLE IF EXISTS
  "Incident",
  "Document",
  "DispatchLink",
  "Booking",
  "Load",
  "PreferredLane",
  "EmptyMileSetting",
  "User",
  "Company"
CASCADE;

DROP TABLE IF EXISTS "_prisma_migrations" CASCADE;

DROP TYPE IF EXISTS "DispatchLinkStatus" CASCADE;
DROP TYPE IF EXISTS "IncidentType" CASCADE;
DROP TYPE IF EXISTS "LoadStatus" CASCADE;
DROP TYPE IF EXISTS "VerificationStatus" CASCADE;
DROP TYPE IF EXISTS "CarrierType" CASCADE;
DROP TYPE IF EXISTS "UserRole" CASCADE;
