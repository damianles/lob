import { VerificationStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getActorContext } from "@/lib/request-context";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ companyId: string }> },
) {
  const actor = await getActorContext();
  if (actor.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const { companyId } = await ctx.params;
  const updated = await prisma.company.update({
    where: { id: companyId },
    data: {
      verificationStatus: VerificationStatus.REJECTED,
    },
  });

  return NextResponse.json({ data: updated });
}

