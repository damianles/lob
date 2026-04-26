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
      realRole: null,
      companyId: null,
      company: null,
      simulated: false,
      viewAs: null,
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

  // When admin is in view-as mode, override the surface-level company traits
  // so the client UI reflects the simulated perspective (Mill vs Wholesaler,
  // Asset vs Broker, Owner-op flag, verified state).
  let projectedCompany = company;
  if (actor.simulated && actor.viewAs && company) {
    projectedCompany = {
      ...company,
      supplierKind:
        actor.viewAs.role === "SHIPPER"
          ? actor.viewAs.supplierKind ?? company.supplierKind
          : null,
      carrierType:
        actor.viewAs.role === "DISPATCHER" || actor.viewAs.role === "DRIVER"
          ? actor.viewAs.carrierType ?? company.carrierType
          : null,
      isOwnerOperator:
        actor.viewAs.role === "DISPATCHER" || actor.viewAs.role === "DRIVER"
          ? Boolean(actor.viewAs.isOwnerOperator)
          : false,
      verificationStatus:
        typeof actor.viewAs.verified === "boolean"
          ? actor.viewAs.verified
            ? "APPROVED"
            : "PENDING"
          : company.verificationStatus,
    };
  }

  return NextResponse.json({
    signedIn: true,
    role: actor.role,
    realRole: actor.realRole,
    companyId: actor.companyId,
    company: projectedCompany,
    simulated: actor.simulated,
    viewAs: actor.viewAs,
  });
}
