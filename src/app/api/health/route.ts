import { NextResponse } from "next/server";

/**
 * Safe diagnostics for Vercel: which required env vars exist (no values exposed).
 */
export async function GET() {
  const missing: string[] = [];
  if (!process.env.DATABASE_URL?.trim()) missing.push("DATABASE_URL");
  if (!process.env.CLERK_SECRET_KEY?.trim()) missing.push("CLERK_SECRET_KEY");
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim()) {
    missing.push("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY");
  }

  if (missing.length > 0) {
    return NextResponse.json(
      { ok: false, missing, hint: "Add these in Vercel → Settings → Environment Variables, then redeploy." },
      { status: 503 },
    );
  }

  const db = process.env.DATABASE_URL ?? "";
  const usesPooler = /pooler\.supabase\.com/i.test(db);
  /** Direct project DB host (5432 or 6543) — often unreachable from Vercel; use pooler host from Connect instead. */
  const usesDirectSupabaseHost = /db\.[a-z0-9]+\.supabase\.co/i.test(db) && !usesPooler;

  return NextResponse.json({
    ok: true,
    database: {
      usesSupabaseDirectHost: usesDirectSupabaseHost,
      usesSupabasePooler: usesPooler,
      hint:
        usesDirectSupabaseHost
          ? "DATABASE_URL points at db.<project>.supabase.co — that host often fails from Vercel. Replace with the Session pooler URI from Supabase Connect (host contains pooler.supabase.com), then redeploy."
          : !usesPooler && db.includes("supabase")
            ? "If you still see DB errors, double-check you are using a pooler connection string from Supabase Connect, not the direct database host."
            : undefined,
    },
  });
}
