import { NotificationEvent, VerificationStatus } from "@prisma/client";

import { enqueueNotice } from "@/lib/notifications/dispatch";
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
      insuranceCoverageVerifiedAt: true,
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
  if (
    status === VerificationStatus.APPROVED &&
    queue === "carrier" &&
    !company.insuranceCoverageVerifiedAt
  ) {
    return {
      ok: false as const,
      status: 400,
      error:
        "Confirm insurance coverage first: open the COI and verify cargo and auto liability match what the carrier entered.",
    };
  }

  const updated = await prisma.company.update({
    where: { id: companyId },
    data: { verificationStatus: status },
  });

  if (status === VerificationStatus.APPROVED || status === VerificationStatus.REJECTED) {
    const approved = status === VerificationStatus.APPROVED;
    enqueueNotice({
      companyId,
      event: approved ? NotificationEvent.ACCOUNT_APPROVED : NotificationEvent.ACCOUNT_NEEDS_ATTENTION,
      dedupeKey: `account:${companyId}:${status}:${updated.updatedAt.toISOString()}`,
      subject: approved ? "Your company is approved" : "Your company was not approved",
      headline: approved
        ? `${updated.legalName} is approved on Lumber One Board.`
        : `${updated.legalName} was not approved.`,
      lines: approved
        ? ["You can post or book loads."]
        : ["Sign in to see what is still missing."],
    });
  }

  return { ok: true as const, data: updated };
}

export async function markCompanyCreditDocsVerified(
  companyId: string,
  queue: AdminVerificationQueue,
) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      id: true,
      supplierKind: true,
      carrierType: true,
      insuranceCoverageVerifiedAt: true,
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

  if (queue === "carrier" && !company.insuranceCoverageVerifiedAt) {
    return {
      ok: false as const,
      status: 400,
      error:
        "Confirm insurance coverage first (open COI, match cargo and auto liability to carrier input), then mark docs verified.",
    };
  }

  const updated = await prisma.company.update({
    where: { id: companyId },
    data: { creditDocsVerifiedAt: new Date() },
  });

  return { ok: true as const, data: updated };
}

/** Admin opened the COI and confirmed entered cargo / auto liability match the file. */
export async function markCompanyInsuranceCoverageVerified(companyId: string) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true, carrierType: true },
  });
  if (!company) {
    return { ok: false as const, status: 404, error: "Company not found." };
  }
  if (company.carrierType == null) {
    return { ok: false as const, status: 404, error: "Not a carrier company." };
  }

  const latest = await prisma.document.findFirst({
    where: { companyId, kind: "INSURANCE", dispatchLinkId: null },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      fileUrl: true,
      expiresAt: true,
      cargoCoverageUsd: true,
      autoLiabilityCoverageUsd: true,
    },
  });
  if (!latest) {
    return { ok: false as const, status: 400, error: "No insurance document on file." };
  }
  if (!latest.expiresAt || !latest.cargoCoverageUsd || !latest.autoLiabilityCoverageUsd) {
    return {
      ok: false as const,
      status: 400,
      error: "Carrier must file expiry, cargo coverage, and auto liability before you can confirm.",
    };
  }

  const updated = await prisma.company.update({
    where: { id: companyId },
    data: { insuranceCoverageVerifiedAt: new Date() },
  });

  return { ok: true as const, data: updated, insurance: latest };
}
