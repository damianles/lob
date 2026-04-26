import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { getActorContext } from "@/lib/request-context";

const patchSchema = z.object({
  label: z.string().trim().max(80).nullable().optional(),
  originAddress: z.string().trim().max(120).nullable().optional(),
  originPhone: z.string().trim().max(40).nullable().optional(),
  destinationAddress: z.string().trim().max(120).nullable().optional(),
  destinationPhone: z.string().trim().max(40).nullable().optional(),
});

async function loadOwn(id: string, companyId: string) {
  const row = await prisma.savedLane.findUnique({ where: { id } });
  if (!row) return { row: null, status: 404 as const };
  if (row.companyId !== companyId) return { row: null, status: 403 as const };
  return { row, status: 200 as const };
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const actor = await getActorContext();
  if (!actor.companyId || actor.role !== "SHIPPER") {
    return NextResponse.json({ error: "Sign in as a supplier." }, { status: 401 });
  }
  const { id } = await ctx.params;
  const owned = await loadOwn(id, actor.companyId);
  if (!owned.row) {
    return NextResponse.json(
      { error: owned.status === 404 ? "Lane not found." : "Not your lane." },
      { status: owned.status },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const t = parsed.data;
  const updated = await prisma.savedLane.update({
    where: { id },
    data: {
      ...(t.label !== undefined ? { label: t.label?.trim() || null } : {}),
      ...(t.originAddress !== undefined
        ? { originAddress: t.originAddress?.trim() || null }
        : {}),
      ...(t.originPhone !== undefined ? { originPhone: t.originPhone?.trim() || null } : {}),
      ...(t.destinationAddress !== undefined
        ? { destinationAddress: t.destinationAddress?.trim() || null }
        : {}),
      ...(t.destinationPhone !== undefined
        ? { destinationPhone: t.destinationPhone?.trim() || null }
        : {}),
    },
  });
  return NextResponse.json({ data: updated });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const actor = await getActorContext();
  if (!actor.companyId || actor.role !== "SHIPPER") {
    return NextResponse.json({ error: "Sign in as a supplier." }, { status: 401 });
  }
  const { id } = await ctx.params;
  const owned = await loadOwn(id, actor.companyId);
  if (!owned.row) {
    return NextResponse.json(
      { error: owned.status === 404 ? "Lane not found." : "Not your lane." },
      { status: owned.status },
    );
  }
  await prisma.savedLane.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
