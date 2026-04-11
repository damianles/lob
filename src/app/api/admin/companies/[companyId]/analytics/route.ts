import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { getActorContext } from "@/lib/request-context";

const schema = z.object({
  enabled: z.boolean(),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ companyId: string }> },
) {
  const actor = await getActorContext();
  if (actor.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { companyId } = await ctx.params;
  const updated = await prisma.company.update({
    where: { id: companyId },
    data: {
      analyticsSubscriber: parsed.data.enabled,
    },
    select: {
      id: true,
      legalName: true,
      analyticsSubscriber: true,
    },
  });

  return NextResponse.json({ data: updated });
}

