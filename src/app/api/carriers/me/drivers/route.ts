import { NextResponse } from "next/server";
import { z } from "zod";

import { listCarrierDrivers, rememberCarrierDriver } from "@/lib/carrier-drivers";
import { getActorContext } from "@/lib/request-context";

const upsertDriverSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(40).optional(),
  email: z.string().trim().max(200).optional(),
}).transform((d) => ({
  name: d.name,
  phone: d.phone || undefined,
  email: d.email && z.string().email().safeParse(d.email).success ? d.email : undefined,
}));

export async function GET() {
  const actor = await getActorContext();
  if (!actor.userId || !actor.companyId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  if (actor.role !== "DISPATCHER" && actor.role !== "ADMIN") {
    return NextResponse.json({ error: "Carrier dispatchers only." }, { status: 403 });
  }

  const drivers = await listCarrierDrivers(actor.companyId);
  return NextResponse.json({ data: drivers });
}

export async function POST(req: Request) {
  const actor = await getActorContext();
  if (!actor.userId || !actor.companyId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  if (actor.role !== "DISPATCHER" && actor.role !== "ADMIN") {
    return NextResponse.json({ error: "Carrier dispatchers only." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = upsertDriverSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const driver = await rememberCarrierDriver({
    companyId: actor.companyId,
    name: parsed.data.name,
    phone: parsed.data.phone,
    email: parsed.data.email,
  });

  return NextResponse.json({ data: driver }, { status: 201 });
}
