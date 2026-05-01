import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getActorContext } from "@/lib/request-context";

export async function GET(req: Request) {
  const actor = await getActorContext();
  if (actor.realRole !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const days = Math.max(1, Math.min(120, Number(searchParams.get("days") ?? "30")));
  const now = new Date();
  const until = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  const documents = await prisma.document.findMany({
    where: {
      kind: "INSURANCE",
      expiresAt: {
        lte: until,
      },
      companyId: {
        not: null,
      },
    },
    orderBy: { expiresAt: "asc" },
    include: {
      company: {
        select: {
          id: true,
          legalName: true,
          verificationStatus: true,
          carrierType: true,
        },
      },
    },
  });

  return NextResponse.json({
    data: documents,
    windowDays: days,
    counts: {
      expiringSoon: documents.length,
      alreadyExpired: documents.filter((d) => d.expiresAt && d.expiresAt < now).length,
    },
  });
}

