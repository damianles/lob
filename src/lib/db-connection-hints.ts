/**
 * User-facing copy when Prisma cannot reach Postgres (common on Vercel + Supabase).
 */
export function getDatabaseErrorGuidance(prismaMessage: string): {
  title: string;
  body: string[];
  code: "direct_supabase_host" | "pool_exhausted" | "generic";
} {
  const msg = prismaMessage.toLowerCase();
  if (
    msg.includes("max clients reached") ||
    msg.includes("emaxconnsession") ||
    /pool_size:\s*\d+/.test(msg)
  ) {
    return {
      title: "Too many database connections (pool exhausted)",
      body: [
        "Supabase’s Session pooler only allows a small number of simultaneous connections from your app (often 15 total).",
        "Each Vercel instance was opening too many Postgres connections at once. The app now defaults to 1 connection per worker when DATABASE_URL uses pooler.supabase.com — deploy that build, or set DATABASE_POOL_MAX=1 in Vercel (Production + Preview) and redeploy.",
        "If errors continue, check that Preview and Production are not both hammering the same DB, or consider Supabase Transaction pooler / a higher database plan.",
      ],
      code: "pool_exhausted",
    };
  }

  const directHost =
    msg.includes("db.") &&
    msg.includes("supabase.co") &&
    !msg.includes("pooler.supabase.com");

  if (directHost || /can't reach database server/i.test(prismaMessage)) {
    return {
      title: "Database unreachable from Vercel",
      body: [
        "Your DATABASE_URL is almost certainly using the Supabase direct host (looks like db.<project>.supabase.co). Serverless regions often cannot reach that host reliably (IPv6 / routing).",
        "In Supabase: Project → Connect → copy the Session pooler (or Transaction pooler) connection string. The host should contain pooler.supabase.com — not db.<project>.supabase.co.",
        "Paste that full URI into Vercel → Project → Settings → Environment Variables → DATABASE_URL (Production + Preview). Redeploy.",
        "Optional: append ?sslmode=require if your client string does not already include ssl parameters.",
      ],
      code: "direct_supabase_host",
    };
  }

  return {
    title: "Database connection failed",
    body: [
      "Confirm DATABASE_URL is set for this environment in Vercel and matches the database you expect.",
      "For Supabase on Vercel, prefer the pooler URI from Connect, not the direct db host.",
    ],
    code: "generic",
  };
}
