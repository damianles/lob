/** Client-safe credit-file constants and types (no Prisma). */

export const CREDIT_FILE_KINDS = ["W9", "CREDIT_REFERENCE", "INSURANCE", "BUSINESS_REGISTRATION"] as const;
export type CreditFileKind = (typeof CREDIT_FILE_KINDS)[number];

export const CREDIT_FILE_LABELS: Record<CreditFileKind, string> = {
  W9: "W-9",
  CREDIT_REFERENCE: "Credit reference",
  INSURANCE: "Certificate of insurance",
  BUSINESS_REGISTRATION: "Business registration / tax form",
};

export type CreditFileDocument = {
  id: string;
  kind: CreditFileKind;
  label: string;
  fileUrl: string;
  expiresAt: string | null;
};

export type CreditFileView = {
  subjectName: string;
  authorized: boolean;
  documents: CreditFileDocument[];
  reviewedAt: string | null;
};

export function isCreditKind(kind: string): kind is CreditFileKind {
  return (CREDIT_FILE_KINDS as readonly string[]).includes(kind);
}
