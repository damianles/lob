import { prisma } from "@/lib/prisma";

export const INSURANCE_EXPIRY_WARN_DAYS = 30;

export type CarrierInsuranceStatus = {
  documentId: string | null;
  expiresAt: Date | null;
  /** Latest COI expires after end of today (UTC). */
  current: boolean;
  /** Calendar days from today (UTC) until expiry date; null if no expiry. Negative if already past. */
  daysUntilExpiry: number | null;
  /** Unexpired but within the warn window. */
  expiringSoon: boolean;
};

/** End of the given UTC calendar day (23:59:59.999Z). */
export function endOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
}

/** Start of today UTC. */
export function startOfUtcToday(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function daysBetweenUtcDates(from: Date, to: Date): number {
  const a = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  const b = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
  return Math.round((b - a) / 86_400_000);
}

/**
 * Latest INSURANCE document by createdAt is the source of truth.
 * Current = expiresAt is strictly after end of today (UTC).
 */
export async function getCarrierInsuranceStatus(
  companyId: string,
  now = new Date(),
): Promise<CarrierInsuranceStatus> {
  const latest = await prisma.document.findFirst({
    where: { companyId, kind: "INSURANCE", dispatchLinkId: null },
    orderBy: { createdAt: "desc" },
    select: { id: true, expiresAt: true },
  });

  if (!latest?.expiresAt) {
    return {
      documentId: latest?.id ?? null,
      expiresAt: null,
      current: false,
      daysUntilExpiry: null,
      expiringSoon: false,
    };
  }

  const expiresAt = latest.expiresAt;
  const todayEnd = endOfUtcDay(now);
  const current = expiresAt.getTime() > todayEnd.getTime();
  const daysUntilExpiry = daysBetweenUtcDates(now, expiresAt);
  const expiringSoon =
    current && daysUntilExpiry !== null && daysUntilExpiry <= INSURANCE_EXPIRY_WARN_DAYS;

  return {
    documentId: latest.id,
    expiresAt,
    current,
    daysUntilExpiry,
    expiringSoon,
  };
}

export function carrierInsuranceBlockedMessage(status: CarrierInsuranceStatus): string {
  if (!status.documentId || !status.expiresAt) {
    return "Upload a current certificate of insurance (with expiry) under Carrier Profile before booking.";
  }
  return "Your certificate of insurance on file has expired. Upload a current COI under Carrier Profile before booking.";
}

/** Returns an error message when insurance is not current; null when OK. */
export async function assertCarrierInsuranceCurrent(
  companyId: string,
): Promise<string | null> {
  const status = await getCarrierInsuranceStatus(companyId);
  if (status.current) return null;
  return carrierInsuranceBlockedMessage(status);
}
