import { VerificationStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type AdminVerificationQueue = "carrier" | "supplier";

function matchesQueue(
  company: { supplierKind: string | null; carrierType: string | null },
  queue: AdminVerificationQueue,
): boolean {
  if (queue === "supplier") {
    return company.supplierKind != null && company.carrierType == null;
  }
  return company.carrierType != null;
}

export async function updateCompanyVerificationStatus(
  companyId: string,
  status: VerificationStatus,
  queue: AdminVerificationQueue,
) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      id: true,
      supplierKind: true,
      carrierType: true,
      creditDocsVerifiedAt: true,
    },
  });
  if (!company) {
    return { ok: false as const, status: 404, error: "Company not found." };
  }
  if (!matchesQueue(company, queue)) {
    return {
      ok: false as const,
      status: 404,
      error: queue === "supplier" ? "Not a supplier company." : "Not a carrier company.",
    };
  }

  if (status === VerificationStatus.APPROVED && !company.creditDocsVerifiedAt) {
    return {
      ok: false as const,
      status: 400,
      error: "Mark credit documents verified after opening the W-9 and credit links (and insurance for carriers).",
    };
  }

  const updated = await prisma.company.update({
    where: { id: companyId },
    data: { verificationStatus: status },
  });

  return { ok: true as const, data: updated };
}

export async function markCompanyCreditDocsVerified(
  companyId: string,
  queue: AdminVerificationQueue,
) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true, supplierKind: true, carrierType: true },
  });
  if (!company) {
    return { ok: false as const, status: 404, error: "Company not found." };
  }
  if (!matchesQueue(company, queue)) {
    return {
      ok: false as const,
      status: 404,
      error: queue === "supplier" ? "Not a supplier company." : "Not a carrier company.",
    };
  }

  const updated = await prisma.company.update({
    where: { id: companyId },
    data: { creditDocsVerifiedAt: new Date() },
  });

  return { ok: true as const, data: updated };
}
