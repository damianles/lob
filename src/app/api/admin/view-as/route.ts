import { NextResponse } from "next/server";

import { getActorContext } from "@/lib/request-context";
import {
  encodeViewAsCookie,
  isViewAsPayload,
  VIEW_AS_COOKIE,
  type ViewAsPayload,
} from "@/lib/view-as";

/**
 * Set or clear the admin "view-as" cookie used by `getActorContext()` to
 * simulate a non-admin perspective. Only the *real* role is checked, so a
 * non-admin who calls this endpoint with a forged session is rejected.
 *
 * - POST { payload: null }                 → clear the cookie (back to admin view)
 * - POST { payload: ViewAsPayload }        → set the simulated profile
 */
export async function POST(req: Request) {
  const actor = await getActorContext();
  if (!actor.userId || actor.realRole !== "ADMIN") {
    return NextResponse.json({ error: "Admin only." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const payload =
    body && typeof body === "object" && "payload" in body
      ? (body as { payload: unknown }).payload
      : null;

  // Clear case
  if (payload === null) {
    const res = NextResponse.json({ ok: true, simulated: false });
    res.cookies.set(VIEW_AS_COOKIE, "", {
      path: "/",
      maxAge: 0,
      httpOnly: false,
      sameSite: "lax",
    });
    return res;
  }

  if (!isViewAsPayload(payload)) {
    return NextResponse.json(
      { error: "payload must be null or a valid ViewAsPayload." },
      { status: 400 },
    );
  }

  const typed: ViewAsPayload = payload;
  const value = encodeViewAsCookie(typed);

  const res = NextResponse.json({ ok: true, simulated: typed.role !== "ADMIN", payload: typed });
  res.cookies.set(VIEW_AS_COOKIE, value, {
    path: "/",
    // 8 hour soft expiry — long enough for a design review session, short
    // enough to auto-clear so admins don't accidentally browse production as a
    // shipper for days on end.
    maxAge: 60 * 60 * 8,
    httpOnly: false,
    sameSite: "lax",
  });
  return res;
}
