import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { getActorContext } from "@/lib/request-context";

const patchSchema = z.object({
  fleetTruckCount: z.number().int().min(0).max(5000).nullable().optional(),
  fleetTrailerCount: z.number().int().min(0).max(5000).nullable().optional(),
  trailerEquipmentTypes: z.array(z.string().min(1).max(64)).max(40).optional(),
  carrierProfileBlurb: z.string().max(4000).nullable().optional(),
  isOwnerOperator: z.boolean().optional(),
});

export async function PATCH(req: Request) {
  const actor = await getActorContext();
  if (!actor.companyId || !actor.userId) {
    return NextResponse.json({ error: "Sign in and link a company." }, { status: 401 });
  }
  if (actor.role !== "DISPATCHER" && actor.role !== "ADMIN") {
    return NextResponse.json({ error: "Carriers only." }, { status: 403 });
  }

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const trailerJson =
    data.trailerEquipmentTypes != null ? JSON.stringify(data.trailerEquipmentTypes) : undefined;

  const updated = await prisma.company.update({
    where: { id: actor.companyId },
    data: {
      ...(data.fleetTruckCount !== undefined ? { fleetTruckCount: data.fleetTruckCount } : {}),
      ...(data.fleetTrailerCount !== undefined ? { fleetTrailerCount: data.fleetTrailerCount } : {}),
      ...(trailerJson !== undefined ? { trailerEquipmentTypes: trailerJson } : {}),
      ...(data.carrierProfileBlurb !== undefined ? { carrierProfileBlurb: data.carrierProfileBlurb } : {}),
      ...(data.isOwnerOperator !== undefined ? { isOwnerOperator: data.isOwnerOperator } : {}),
    },
    select: {
      id: true,
      fleetTruckCount: true,
      fleetTrailerCount: true,
      trailerEquipmentTypes: true,
      carrierProfileBlurb: true,
      isOwnerOperator: true,
      factoringEligible: true,
    },
  });

  return NextResponse.json({ data: updated });
}
