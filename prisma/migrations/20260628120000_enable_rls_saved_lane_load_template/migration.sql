-- Enable RLS on SavedLane and LoadTemplate (Supabase security advisor).
-- App uses Prisma via postgres/pooler role which bypasses RLS.
-- No permissive policies: blocks anon/authenticated PostgREST exposure.

ALTER TABLE "SavedLane" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LoadTemplate" ENABLE ROW LEVEL SECURITY;
