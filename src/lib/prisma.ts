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
  let url = raw;
  if (/\bsslmode=/i.test(url)) {
    return url.replace(/\bsslmode=(require|verify-full|verify-ca|prefer)\b/gi, "sslmode=no-verify");
  }
  return url + (url.includes("?") ? "&" : "?") + "sslmode=no-verify";
}

/** Next sets this while running `next build` (route modules load; no DB is contacted until queries run). */
function isNextProductionBuild(): boolean {
  return process.env.NEXT_PHASE === "phase-production-build";
}

function poolOptions(): PoolConfig {
  let connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    if (isNextProductionBuild()) {
      // Valid shape for `pg` + Prisma adapter; no connection is opened during `next build` for this app.
      connectionString = "postgresql://build_placeholder:build_placeholder@127.0.0.1:5432/build_placeholder?schema=public";
    } else {
      throw new Error("DATABASE_URL is not set");
    }
  }
  return { connectionString: connectionStringForPgPool(connectionString) };
}

export const prisma =
  global.prismaGlobal ??
  new PrismaClient({
    adapter: new PrismaPg(new Pool(poolOptions())),
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.prismaGlobal = prisma;
}

