import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getActorContext } from "@/lib/request-context";

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const actor = await getActorContext();
  if (!actor.companyId || actor.role !== "SHIPPER") {
    return NextResponse.json({ error: "Sign in as a supplier." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const row = await prisma.loadTemplate.findUnique({ where: { id } });
  if (!row) return NextResponse.json({ error: "Template not found." }, { status: 404 });
  if (row.companyId !== actor.companyId) {
    return NextResponse.json({ error: "Not your template." }, { status: 403 });
  }

  await prisma.loadTemplate.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
