import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getActorContext } from "@/lib/request-context";

/** Who am I in LOB (for client nav, etc.) — not a secret. */
export async function GET() {
  const actor = await getActorContext();
  if (!actor.userId) {
    return NextResponse.json({
      signedIn: false,
      role: null,
      companyId: null,
      company: null,
    });
  }

  let company: {
    id: string;
    legalName: string;
    supplierKind: "MILL" | "WHOLESALER" | "OTHER" | null;
    carrierType: "ASSET_BASED" | "BROKER" | null;
    isOwnerOperator: boolean;
    verificationStatus: "PENDING" | "APPROVED" | "REJECTED";
  } | null = null;

  if (actor.companyId) {
    try {
      const c = await prisma.company.findUnique({
        where: { id: actor.companyId },
        select: {
          id: true,
          legalName: true,
          supplierKind: true,
          carrierType: true,
          isOwnerOperator: true,
          verificationStatus: true,
        },
      });
      if (c) company = c;
    } catch {
      company = null;
    }
  }

  return NextResponse.json({
    signedIn: true,
    role: actor.role,
    companyId: actor.companyId,
    company,
  });
}
