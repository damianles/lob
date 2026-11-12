import { NextResponse } from "next/server";

import { enqueueInsuranceExpiryNotices } from "@/lib/notifications/dispatch";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorizeCron(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    // Local / unset: allow only in development so misconfigured prod fails closed.
    return process.env.NODE_ENV === "development";
  }
  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  const url = new URL(req.url);
  return url.searchParams.get("secret") === secret;
}

/** Daily job: email carriers whose latest COI expires within 30 days. */
export async function GET(req: Request) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await enqueueInsuranceExpiryNotices();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("[cron/insurance-expiry]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Insurance expiry sweep failed" },
      { status: 500 },
    );
  }
}
