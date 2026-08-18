import { NextResponse } from "next/server";

import { PickupConfirmError, confirmLoadPickupByToken } from "@/lib/confirm-load-pickup";
import { pickupConfirmSchema } from "@/lib/validation";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const body = await req.json();
  const parsed = pickupConfirmSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const updated = await confirmLoadPickupByToken(token, parsed.data.pickupCode);
    return NextResponse.json({ data: updated });
  } catch (e) {
    if (e instanceof PickupConfirmError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }
}

