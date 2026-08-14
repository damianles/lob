import type { Prisma } from "@prisma/client";

/**
 * Derive a 2–3 letter acronym from a legal name when Company.acronym is unset.
 * Prefer initials of significant words; fall back to first letters of the name.
 */
export function deriveCompanyAcronym(legalName: string): string {
  const words = legalName
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((w) => !["THE", "AND", "OF", "INC", "LLC", "LTD", "CO", "CORP"].includes(w));

  if (words.length >= 2) {
    const initials = words.map((w) => w[0]!).join("").slice(0, 3);
    if (initials.length >= 2) return initials;
  }

  const compact = legalName.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  return (compact.slice(0, 3) || "XXX").padEnd(2, "X").slice(0, 3);
}

/**
 * Allocate next global LOB load reference: LOB-{ACRONYM}-{YY}-{NNNN}
 * Sequence starts at 1000 and never resets.
 */
export async function allocateLobReference(
  tx: Prisma.TransactionClient,
  shipperCompanyId: string,
): Promise<string> {
  const company = await tx.company.findUniqueOrThrow({
    where: { id: shipperCompanyId },
    select: { acronym: true, legalName: true },
  });

  const acronym = (company.acronym?.trim() || deriveCompanyAcronym(company.legalName)).toUpperCase();

  await tx.loadRefCounter.upsert({
    where: { id: "global" },
    create: { id: "global", next: 1000 },
    update: {},
  });

  const after = await tx.loadRefCounter.update({
    where: { id: "global" },
    data: { next: { increment: 1 } },
  });

  const seq = after.next - 1;
  const yy = String(new Date().getFullYear()).slice(-2);
  const nnnn = String(seq).padStart(4, "0");

  return `LOB-${acronym}-${yy}-${nnnn}`;
}
