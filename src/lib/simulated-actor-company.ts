import { prisma } from "@/lib/prisma";
import {
  SEED_CARRIER_COMPANY_NAME,
  SEED_SHIPPER_COMPANY_NAME,
} from "@/lib/admin-test-personas";
import type { ViewAsPayload } from "@/lib/view-as";

/** Seed company row used when an admin previews a non-admin persona via view-as. */
export async function seedCompanyIdForViewAs(viewAs: ViewAsPayload): Promise<string | null> {
  if (viewAs.role === "SHIPPER") {
    const co = await prisma.company.findUnique({
      where: { legalName: SEED_SHIPPER_COMPANY_NAME },
      select: { id: true },
    });
    return co?.id ?? null;
  }
  if (viewAs.role === "DISPATCHER" || viewAs.role === "DRIVER") {
    const co = await prisma.company.findUnique({
      where: { legalName: SEED_CARRIER_COMPANY_NAME },
      select: { id: true },
    });
    return co?.id ?? null;
  }
  return null;
}

export function isSupplierActor(actor: {
  userId: string | null;
  role: string | null;
  companyId: string | null;
}): boolean {
  return Boolean(actor.userId && actor.role === "SHIPPER" && actor.companyId);
}
