import { NextResponse } from "next/server";
import { z } from "zod";

import { LoadLifecycleError, resolveNeedsRepost } from "@/lib/load-lifecycle";
import { getActorContext } from "@/lib/request-context";
import { isSupplierActor } from "@/lib/simulated-actor-company";

const bodySchema = z.object({
  decision: z.enum(["ACCEPT", "DECLINE"]),
  pickupAt: z.string().min(8).optional(),
  deliveryAt: z.string().min(8).optional(),
});

export async function POST(req: Request, ctx: { params: Promise<{ loadId: string }> }) {
  const actor = await getActorContext();
  if (!isSupplierActor(actor) || !actor.companyId || !actor.userId) {
    return NextResponse.json({ error: "Supplier accounts only." }, { status: 403 });
  }

  const { loadId } = await ctx.params;
  const raw = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await resolveNeedsRepost({
      loadId,
      shipperCompanyId: actor.companyId,
      userId: actor.userId,
      decision: parsed.data.decision,
      pickupAt: parsed.data.pickupAt,
      deliveryAt: parsed.data.deliveryAt,
    });
    return NextResponse.json({ data: result });
  } catch (e) {
    if (e instanceof LoadLifecycleError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }
}
