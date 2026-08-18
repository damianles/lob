import { NextResponse } from "next/server";

import { PickupConfirmError, confirmLoadPickupByToken } from "@/lib/confirm-load-pickup";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;

  try {
    const updated = await confirmLoadPickupByToken(token);
    return NextResponse.json({ data: updated });
  } catch (e) {
    if (e instanceof PickupConfirmError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }
}
