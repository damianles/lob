import { prisma } from "@/lib/prisma";

export type AfterDeclineAction = "LEAVE" | "EXCLUDE" | "TIER";

/**
 * Apply a one-carrier preference change after the mill declines a take/bid.
 * EXCLUDE and TIER are mutually exclusive for that carrier.
 */
export async function applyShipperCarrierAfterDecline(args: {
  shipperCompanyId: string;
  carrierCompanyId: string;
  action: AfterDeclineAction;
  tier?: 1 | 2 | 3;
}) {
  if (args.action === "LEAVE") return { applied: "LEAVE" as const };

  if (args.action === "EXCLUDE") {
    await prisma.$transaction([
      prisma.shipperCarrierExclusion.upsert({
        where: {
          shipperCompanyId_carrierCompanyId: {
            shipperCompanyId: args.shipperCompanyId,
            carrierCompanyId: args.carrierCompanyId,
          },
        },
        create: {
          shipperCompanyId: args.shipperCompanyId,
          carrierCompanyId: args.carrierCompanyId,
        },
        update: {},
      }),
      prisma.shipperCarrierTier.deleteMany({
        where: {
          shipperCompanyId: args.shipperCompanyId,
          carrierCompanyId: args.carrierCompanyId,
        },
      }),
    ]);
    return { applied: "EXCLUDE" as const };
  }

  const tier = args.tier;
  if (tier !== 1 && tier !== 2 && tier !== 3) {
    throw new Error("TIER action requires tier 1, 2, or 3.");
  }

  await prisma.$transaction([
    prisma.shipperCarrierExclusion.deleteMany({
      where: {
        shipperCompanyId: args.shipperCompanyId,
        carrierCompanyId: args.carrierCompanyId,
      },
    }),
    prisma.shipperCarrierTier.upsert({
      where: {
        shipperCompanyId_carrierCompanyId: {
          shipperCompanyId: args.shipperCompanyId,
          carrierCompanyId: args.carrierCompanyId,
        },
      },
      create: {
        shipperCompanyId: args.shipperCompanyId,
        carrierCompanyId: args.carrierCompanyId,
        tier,
      },
      update: { tier },
    }),
  ]);
  return { applied: "TIER" as const, tier };
}
