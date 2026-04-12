/**
 * User-facing copy when Prisma cannot reach Postgres (common on Vercel + Supabase).
 */
export function getDatabaseErrorGuidance(prismaMessage: string): {
  title: string;
  body: string[];
  code: "direct_supabase_host" | "generic";
} {
  const msg = prismaMessage.toLowerCase();
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
