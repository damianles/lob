import { prisma } from "@/lib/prisma";

function normalizeOptional(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/** Upsert a driver contact for the carrier company after paperwork assignment. */
export async function rememberCarrierDriver(input: {
  companyId: string;
  name: string;
  phone?: string | null;
  email?: string | null;
}) {
  const name = input.name.trim();
  if (name.length < 2) return null;

  const phone = normalizeOptional(input.phone);
  const email = normalizeOptional(input.email)?.toLowerCase() ?? null;

  const existing = await prisma.carrierDriver.findFirst({
    where: {
      companyId: input.companyId,
      name: { equals: name, mode: "insensitive" },
    },
    orderBy: { lastUsedAt: "desc" },
  });

  if (existing) {
    return prisma.carrierDriver.update({
      where: { id: existing.id },
      data: {
        name,
        phone: phone ?? existing.phone,
        email: email ?? existing.email,
        lastUsedAt: new Date(),
      },
    });
  }

  return prisma.carrierDriver.create({
    data: {
      companyId: input.companyId,
      name,
      phone,
      email,
      lastUsedAt: new Date(),
    },
  });
}

export async function listCarrierDrivers(companyId: string) {
  return prisma.carrierDriver.findMany({
    where: { companyId },
    orderBy: { lastUsedAt: "desc" },
    take: 50,
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      lastUsedAt: true,
    },
  });
}
