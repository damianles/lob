import { VerificationStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getActorContext } from "@/lib/request-context";
import { isSupplierActor } from "@/lib/simulated-actor-company";

/** Approved carrier companies for supplier UI (tiers, blocks, per-load rules). */
export async function GET() {
  const actor = await getActorContext();
  if (!isSupplierActor(actor)) {
    return NextResponse.json({ error: "Supplier accounts only." }, { status: 403 });
  }

  const carriers = await prisma.company.findMany({
    where: {
      verificationStatus: VerificationStatus.APPROVED,
      carrierType: { not: null },
    },
    orderBy: { legalName: "asc" },
    select: {
      id: true,
      legalName: true,
      dotNumber: true,
      carrierType: true,
    },
  });

  return NextResponse.json({ data: carriers });
}
