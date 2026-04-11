import { CarrierType, LoadStatus, SupplierKind, UserRole, VerificationStatus } from "@prisma/client";

import { prisma } from "../src/lib/prisma";

async function main() {
  const shipperCompany = await prisma.company.upsert({
    where: { legalName: "North Ridge Lumber" },
    update: {
      analyticsSubscriber: true,
      supplierKind: SupplierKind.MILL,
    },
    create: {
      legalName: "North Ridge Lumber",
      verificationStatus: VerificationStatus.APPROVED,
      analyticsSubscriber: true,
      supplierKind: SupplierKind.MILL,
    },
  });

  const carrierCompany = await prisma.company.upsert({
    where: { legalName: "Blue Ox Transport" },
    update: {
      analyticsSubscriber: true,
    },
    create: {
      legalName: "Blue Ox Transport",
      carrierType: CarrierType.ASSET_BASED,
      verificationStatus: VerificationStatus.APPROVED,
      reliabilityScore: 96,
      factoringEligible: true,
      analyticsSubscriber: true,
    },
  });

  const dispatcher = await prisma.user.upsert({
    where: { email: "dispatch@blueox.test" },
    update: {},
    create: {
      email: "dispatch@blueox.test",
      name: "Alex Dispatcher",
      role: UserRole.DISPATCHER,
      companyId: carrierCompany.id,
    },
  });

  const shipperUser = await prisma.user.upsert({
    where: { email: "ops@northridge.test" },
    update: {},
    create: {
      email: "ops@northridge.test",
      name: "Jordan Shipping",
      role: UserRole.SHIPPER,
      companyId: shipperCompany.id,
    },
  });

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@lob.test" },
    update: {},
    create: {
      email: "admin@lob.test",
      name: "LOB Admin",
      role: UserRole.ADMIN,
      companyId: null,
    },
  });

  const pu1 = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

  await prisma.load.upsert({
    where: { referenceNumber: "LOB-SEED-0001" },
    update: {
      originCity: "Portland",
      originState: "OR",
      originZip: "97201",
      destinationCity: "Sacramento",
      destinationState: "CA",
      destinationZip: "95814",
      weightLbs: 42000,
      equipmentType: "Flatbed",
      isRush: true,
      offeredRateUsd: 3200,
      marketRateUsd: 3050,
      shipperCompanyId: shipperCompany.id,
      createdByUserId: shipperUser.id,
      uniquePickupCode: "AX74Q1",
      requestedPickupAt: pu1,
    },
    create: {
      referenceNumber: "LOB-SEED-0001",
      originCity: "Portland",
      originState: "OR",
      originZip: "97201",
      destinationCity: "Sacramento",
      destinationState: "CA",
      destinationZip: "95814",
      weightLbs: 42000,
      equipmentType: "Flatbed",
      isRush: true,
      offeredRateUsd: 3200,
      marketRateUsd: 3050,
      shipperCompanyId: shipperCompany.id,
      createdByUserId: shipperUser.id,
      uniquePickupCode: "AX74Q1",
      requestedPickupAt: pu1,
    },
  });

  const extraLoads: Array<{
    ref: string;
    originCity: string;
    originState: string;
    originZip: string;
    destinationCity: string;
    destinationState: string;
    destinationZip: string;
    weightLbs: number;
    equipmentType: string;
    isRush: boolean;
    offeredRateUsd: number;
    pickupDaysFromNow: number;
  }> = [
    {
      ref: "LOB-SEED-0002",
      originCity: "Seattle",
      originState: "WA",
      originZip: "98101",
      destinationCity: "Boise",
      destinationState: "ID",
      destinationZip: "83702",
      weightLbs: 38000,
      equipmentType: "Dry van",
      isRush: false,
      offeredRateUsd: 2250,
      pickupDaysFromNow: 4,
    },
    {
      ref: "LOB-SEED-0003",
      originCity: "Dallas",
      originState: "TX",
      originZip: "75201",
      destinationCity: "Oklahoma City",
      destinationState: "OK",
      destinationZip: "73102",
      weightLbs: 44000,
      equipmentType: "Flatbed",
      isRush: false,
      offeredRateUsd: 1900,
      pickupDaysFromNow: 5,
    },
    {
      ref: "LOB-SEED-0004",
      originCity: "Portland",
      originState: "OR",
      originZip: "97201",
      destinationCity: "Reno",
      destinationState: "NV",
      destinationZip: "89501",
      weightLbs: 40000,
      equipmentType: "Reefer",
      isRush: true,
      offeredRateUsd: 3400,
      pickupDaysFromNow: 6,
    },
    {
      ref: "LOB-SEED-0005",
      originCity: "Atlanta",
      originState: "GA",
      originZip: "30303",
      destinationCity: "Nashville",
      destinationState: "TN",
      destinationZip: "37203",
      weightLbs: 35000,
      equipmentType: "Dry van",
      isRush: false,
      offeredRateUsd: 1650,
      pickupDaysFromNow: 2,
    },
    {
      ref: "LOB-SEED-0006",
      originCity: "Spokane",
      originState: "WA",
      originZip: "99201",
      destinationCity: "Billings",
      destinationState: "MT",
      destinationZip: "59101",
      weightLbs: 42000,
      equipmentType: "Flatbed",
      isRush: false,
      offeredRateUsd: 2800,
      pickupDaysFromNow: 7,
    },
  ];

  for (const row of extraLoads) {
    const requestedPickupAt = new Date(Date.now() + row.pickupDaysFromNow * 24 * 60 * 60 * 1000);
    await prisma.load.upsert({
      where: { referenceNumber: row.ref },
      update: {
        originCity: row.originCity,
        originState: row.originState,
        originZip: row.originZip,
        destinationCity: row.destinationCity,
        destinationState: row.destinationState,
        destinationZip: row.destinationZip,
        weightLbs: row.weightLbs,
        equipmentType: row.equipmentType,
        isRush: row.isRush,
        offeredRateUsd: row.offeredRateUsd,
        shipperCompanyId: shipperCompany.id,
        createdByUserId: shipperUser.id,
        status: LoadStatus.POSTED,
        requestedPickupAt,
      },
      create: {
        referenceNumber: row.ref,
        originCity: row.originCity,
        originState: row.originState,
        originZip: row.originZip,
        destinationCity: row.destinationCity,
        destinationState: row.destinationState,
        destinationZip: row.destinationZip,
        weightLbs: row.weightLbs,
        equipmentType: row.equipmentType,
        isRush: row.isRush,
        offeredRateUsd: row.offeredRateUsd,
        shipperCompanyId: shipperCompany.id,
        createdByUserId: shipperUser.id,
        uniquePickupCode: row.ref.slice(-6).toUpperCase(),
        requestedPickupAt,
      },
    });
  }

  const primaryLoad = await prisma.load.findUnique({
    where: { referenceNumber: "LOB-SEED-0001" },
    include: { booking: true },
  });
  if (primaryLoad && !primaryLoad.booking) {
    await prisma.$transaction([
      prisma.booking.create({
        data: {
          loadId: primaryLoad.id,
          carrierCompanyId: carrierCompany.id,
          agreedRateUsd: 3100,
        },
      }),
      prisma.load.update({
        where: { id: primaryLoad.id },
        data: { status: LoadStatus.BOOKED },
      }),
    ]);
  }

  console.log("Seed complete.");
  console.log({
    shipperCompanyId: shipperCompany.id,
    carrierCompanyId: carrierCompany.id,
    dispatcherUserId: dispatcher.id,
    adminUserId: adminUser.id,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

