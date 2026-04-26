import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getActorContext } from "@/lib/request-context";

/**
 * Bumps useCount + lastUsedAt for a saved lane. Called from the supplier
 * post form when the user clicks "Use lane" so frequently-used lanes float
 * to the top of the picker.
 */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const actor = await getActorContext();
  if (!actor.companyId || actor.role !== "SHIPPER") {
    return NextResponse.json({ error: "Sign in as a supplier." }, { status: 401 });
  }
  const { id } = await ctx.params;

  const row = await prisma.savedLane.findUnique({ where: { id } });
  if (!row || row.companyId !== actor.companyId) {
    return NextResponse.json({ error: "Lane not found." }, { status: 404 });
  }

  const updated = await prisma.savedLane.update({
    where: { id },
    data: {
      useCount: { increment: 1 },
      lastUsedAt: new Date(),
    },
    select: { id: true, useCount: true, lastUsedAt: true },
  });
  return NextResponse.json({ data: updated });
}
