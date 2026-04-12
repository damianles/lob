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

function poolOptionsFromUrl(connectionString: string): PoolConfig {
  return { connectionString: connectionStringForPgPool(connectionString) };
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
