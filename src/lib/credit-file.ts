import {
  CREDIT_FILE_KINDS,
  CREDIT_FILE_LABELS,
  isCreditKind,
  type CreditFileDocument,
  type CreditFileView,
} from "@/lib/credit-file-shared";
import { prisma } from "@/lib/prisma";

export {
  CREDIT_FILE_KINDS,
  CREDIT_FILE_LABELS,
  type CreditFileDocument,
  type CreditFileKind,
  type CreditFileView,
} from "@/lib/credit-file-shared";

export async function companiesShareBooking(companyA: string, companyB: string): Promise<boolean> {
  const row = await prisma.booking.findFirst({
    where: {
      OR: [
        { carrierCompanyId: companyA, load: { shipperCompanyId: companyB } },
        { carrierCompanyId: companyB, load: { shipperCompanyId: companyA } },
      ],
    },
    select: { id: true },
  });
  return Boolean(row);
}

/** Latest signup credit documents for a company the viewer is allowed to see. */
export async function getCreditFileView(
  subjectCompanyId: string,
  reviewerCompanyId: string | null,
): Promise<CreditFileView | null> {
  const company = await prisma.company.findUnique({
    where: { id: subjectCompanyId },
    select: { legalName: true, creditReviewAuthorized: true },
  });
  if (!company) return null;

  const docs = company.creditReviewAuthorized
    ? await prisma.document.findMany({
        where: {
          companyId: subjectCompanyId,
          dispatchLinkId: null,
          kind: { in: [...CREDIT_FILE_KINDS] },
        },
        orderBy: { createdAt: "desc" },
        select: { id: true, kind: true, fileUrl: true, expiresAt: true },
      })
    : [];

  const seen = new Set<string>();
  const documents: CreditFileDocument[] = [];
  for (const doc of docs) {
    if (!isCreditKind(doc.kind) || seen.has(doc.kind)) continue;
    seen.add(doc.kind);
    documents.push({
      id: doc.id,
      kind: doc.kind,
      label: CREDIT_FILE_LABELS[doc.kind],
      fileUrl: doc.fileUrl,
      expiresAt: doc.expiresAt?.toISOString() ?? null,
    });
  }

  let reviewedAt: string | null = null;
  if (reviewerCompanyId) {
    const review = await prisma.creditFileReview.findUnique({
      where: {
        reviewerCompanyId_subjectCompanyId: {
          reviewerCompanyId,
          subjectCompanyId,
        },
      },
      select: { createdAt: true },
    });
    reviewedAt = review?.createdAt.toISOString() ?? null;
  }

  return {
    subjectName: company.legalName,
    authorized: company.creditReviewAuthorized,
    documents,
    reviewedAt,
  };
}
