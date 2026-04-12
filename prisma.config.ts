import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { defineConfig } from "prisma/config";

loadEnv({ path: resolve(process.cwd(), ".env") });
loadEnv({ path: resolve(process.cwd(), ".env.local"), override: true });

/**
 * Migrations need a real Postgres session (DDL). Supabase transaction poolers (e.g. port 6543) often break or hang
 * `prisma migrate deploy`. On Vercel, set MIGRATE_DATABASE_URL to the direct URI (db.<ref>.supabase.co:5432) and keep
 * DATABASE_URL as the pooler URL for the app (src/lib/prisma.ts).
 */
const migrateDatabaseUrl =
  process.env["MIGRATE_DATABASE_URL"]?.trim() || process.env["DATABASE_URL"]?.trim() || "";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: migrateDatabaseUrl,
  },
});
