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
  const usesDirectSupabase = /db\.[^.]+\.supabase\.co:5432/.test(db);
  const usesPooler = /pooler\.supabase\.com/.test(db);

  return NextResponse.json({
    ok: true,
    database: {
      usesSupabaseDirectHost: usesDirectSupabase,
      usesSupabasePooler: usesPooler,
      hint:
        usesDirectSupabase && !usesPooler
          ? "Direct db.*.supabase.co often fails on Vercel (IPv6). Use the Session pooler URL from Supabase Connect for DATABASE_URL on Vercel."
          : undefined,
    },
  });
}
