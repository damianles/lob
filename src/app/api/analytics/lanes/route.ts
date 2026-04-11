import { NextResponse } from "next/server";

import { getLaneQuickOptions } from "@/lib/analytics";
import { getActorContext } from "@/lib/request-context";

export async function GET() {
  const actor = await getActorContext();
  if (!actor.userId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const data = await getLaneQuickOptions();
  return NextResponse.json({ data });
}

