import { NextResponse } from "next/server";
import { z } from "zod";

import {
  acceptCapacityInterest,
  declineCapacityInterest,
  serializeCapacityInterestError,
  withdrawCapacityInterest,
} from "@/lib/capacity-interest";
import { getActorContext } from "@/lib/request-context";
import { isSupplierActor } from "@/lib/simulated-actor-company";

const bodySchema = z.object({
  decision: z.enum(["ACCEPT", "DECLINE", "WITHDRAW"]),
});

export async function POST(req: Request, ctx: { params: Promise<{ interestId: string }> }) {
  const actor = await getActorContext();
  if (!actor.userId || !actor.companyId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { interestId } = await ctx.params;
  const raw = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    if (parsed.data.decision === "WITHDRAW") {
      if (!isSupplierActor(actor)) {
        return NextResponse.json({ error: "Suppliers can withdraw their own requests." }, { status: 403 });
      }
      const updated = await withdrawCapacityInterest({
        interestId,
        shipperCompanyId: actor.companyId,
      });
      return NextResponse.json({ data: updated });
    }

    if (actor.role !== "DISPATCHER" && actor.role !== "ADMIN") {
      return NextResponse.json({ error: "Carriers can accept or decline requests." }, { status: 403 });
    }

    if (parsed.data.decision === "ACCEPT") {
      const result = await acceptCapacityInterest({
        interestId,
        carrierCompanyId: actor.companyId,
        reviewedByUserId: actor.userId,
      });
      return NextResponse.json({ data: result });
    }

    const updated = await declineCapacityInterest({
      interestId,
      carrierCompanyId: actor.companyId,
      reviewedByUserId: actor.userId,
    });
    return NextResponse.json({ data: updated });
  } catch (e) {
    const mapped = serializeCapacityInterestError(e);
    if (mapped) return NextResponse.json({ error: mapped.error }, { status: mapped.status });
    throw e;
  }
}
