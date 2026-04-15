import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool, type PoolConfig } from "pg";

declare global {
  var prismaGlobal: PrismaClient | undefined;
}

/**
 * pg merges `parse(connectionString)` *after* your Pool config, so `sslmode=require` becomes
 * `ssl: {}` and overrides `ssl: { rejectUnauthorized: false }`. Use `sslmode=no-verify` so the
 * parser sets `rejectUnauthorized: false` (TLS still on). See pg-connection-string README.
 */
function connectionStringForPgPool(raw: string): string {
  const isLocal = /localhost|127\.0\.0\.1/.test(raw) || raw.includes("@/");
  const relaxForSupabase =
    (raw.includes("supabase.co") || raw.includes("pooler.supabase.com")) &&
    process.env.DATABASE_SSL_STRICT !== "true";
  if (isLocal || !relaxForSupabase) {
    return raw;
  }
  const url = raw;
  if (/\bsslmode=/i.test(url)) {
    return url.replace(/\bsslmode=(require|verify-full|verify-ca|prefer)\b/gi, "sslmode=no-verify");
  }
  return url + (url.includes("?") ? "&" : "?") + "sslmode=no-verify";
}

function isSupabasePoolerUrl(raw: string): boolean {
  return raw.includes("pooler.supabase.com");
}

/**
 * Supabase Session pooler caps total clients (often 15). `pg` defaults to max 10 connections per Pool —
 * a few warm Vercel lambdas × 10 exhausts the pool instantly (EMAXCONNSESSION / "max clients reached").
 * One connection per serverless worker is the usual fix; override with DATABASE_POOL_MAX if you know your limits.
 */
function poolOptionsFromUrl(connectionString: string): PoolConfig {
  const connectionStringResolved = connectionStringForPgPool(connectionString);
  const fromPooler = isSupabasePoolerUrl(connectionString);
  const envMax = process.env.DATABASE_POOL_MAX?.trim();
  const max =
    envMax !== undefined && envMax !== ""
      ? Math.max(1, Number.parseInt(envMax, 10) || 1)
      : fromPooler
        ? 1
        : 10;

  return {
    connectionString: connectionStringResolved,
    max,
    // Return connections to the pooler quickly when idle (helps stay under Supabase session caps).
    idleTimeoutMillis: fromPooler ? 10_000 : 30_000,
    connectionTimeoutMillis: 15_000,
  };
}

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. In Vercel: Project → Settings → Environment Variables → add DATABASE_URL for this environment (Production and/or Preview), then redeploy.",
    );
  }
  if (/\[YOUR[-_]?PASSWORD\]/i.test(connectionString) || connectionString.includes("[YOUR_PASSWORD]")) {
    throw new Error(
      "DATABASE_URL still contains a placeholder ([YOUR-PASSWORD]). Replace it with your real database password (URL-encoded if it has special characters).",
    );
  }
  return new PrismaClient({
    adapter: new PrismaPg(new Pool(poolOptionsFromUrl(connectionString))),
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
}

function getPrismaClient(): PrismaClient {
  if (global.prismaGlobal) {
    return global.prismaGlobal;
  }
  const client = createPrismaClient();
  global.prismaGlobal = client;
  return client;
}

/**
 * Lazy singleton: importing this module does not connect to Postgres. That way `next build` can
 * load route/page modules even when DATABASE_URL is only injected at runtime on Vercel.
 *
 * The first real query (or `$connect`) throws a clear error if DATABASE_URL is missing or invalid.
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop: string | symbol) {
    const client = getPrismaClient();
    const value = Reflect.get(client as object, prop, client);
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});
