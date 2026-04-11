import { NextResponse } from "next/server";

import { getActorContext } from "@/lib/request-context";

/** Who am I in LOB (for client nav, etc.) — not a secret. */
export async function GET() {
  const actor = await getActorContext();
  if (!actor.userId) {
    return NextResponse.json({ signedIn: false, role: null, companyId: null });
  }
  return NextResponse.json({
    signedIn: true,
    role: actor.role,
    companyId: actor.companyId,
  });
}
