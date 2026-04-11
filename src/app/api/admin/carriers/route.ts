import { VerificationStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getActorContext } from "@/lib/request-context";

export async function GET() {
  const actor = await getActorContext();
  if (actor.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const carriers = await prisma.company.findMany({
    where: {
      carrierType: { not: null },
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      users: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });

  return NextResponse.json({
    data: carriers,
    counts: {
      pending: carriers.filter((c) => c.verificationStatus === VerificationStatus.PENDING).length,
      approved: carriers.filter((c) => c.verificationStatus === VerificationStatus.APPROVED).length,
      rejected: carriers.filter((c) => c.verificationStatus === VerificationStatus.REJECTED).length,
    },
  });
}

