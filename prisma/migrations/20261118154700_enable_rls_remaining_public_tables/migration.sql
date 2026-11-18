-- Secure remaining public tables for Supabase Data API (rls_disabled_in_public).
-- LOB uses Prisma via the database password role, which bypasses RLS.
-- No permissive policies: anon/authenticated PostgREST access is denied.
-- FORCE matches the rest of the LOB schema (Company, Load, User, …).

ALTER TABLE "ShipperLoadAlert" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ShipperLoadAlert" FORCE ROW LEVEL SECURITY;

ALTER TABLE "CreditFileReview" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CreditFileReview" FORCE ROW LEVEL SECURITY;

ALTER TABLE "LegalAcceptance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LegalAcceptance" FORCE ROW LEVEL SECURITY;

-- CapacityInterest already had RLS; force it for consistency with other tables.
ALTER TABLE "CapacityInterest" FORCE ROW LEVEL SECURITY;

-- Defense in depth: strip Data API privileges on every public table.
-- Safe for Prisma-only apps; postgres/pooler role is unaffected.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.relname AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
  LOOP
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated', r.table_name);
  END LOOP;
END $$;
