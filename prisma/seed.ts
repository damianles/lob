import { CarrierType, LoadStatus, SupplierKind, UserRole, VerificationStatus } from "@prisma/client";

import { lumberSpecToLoadColumns, type LumberSpec } from "../src/lib/lumber-spec";
import { inferOfferCurrency } from "../src/lib/lane-currency";
import { prisma } from "../src/lib/prisma";

type SeedLoadRow = {
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
  offerCurrency?: "USD" | "CAD";
  pickupDaysFromNow: number;
  lumber?: LumberSpec;
};

function extendedPostingFor(lumber?: LumberSpec) {
  return lumber ? { lumber } : undefined;
}

async function upsertPostedLoad(shipperCompanyId: string, shipperUserId: string, row: SeedLoadRow) {
  const requestedPickupAt = new Date(Date.now() + row.pickupDaysFromNow * 24 * 60 * 60 * 1000);
  const extendedPosting = extendedPostingFor(row.lumber);
  const lumberCols = lumberSpecToLoadColumns(row.lumber ?? null);

  const shared = {
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
    offerCurrency: row.offerCurrency ?? inferOfferCurrency(row.originState, row.destinationState),
    shipperCompanyId,
    createdByUserId: shipperUserId,
    status: LoadStatus.POSTED,
    requestedPickupAt,
    extendedPosting,
    ...lumberCols,
  };

  await prisma.load.upsert({
    where: { referenceNumber: row.ref },
    update: shared,
    create: {
      referenceNumber: row.ref,
      uniquePickupCode: row.ref.slice(-6).toUpperCase(),
      ...shared,
    },
  });
}

async function main() {
  const shipperCompany = await prisma.company.upsert({
    where: { legalName: "North Ridge Lumber" },
    update: {
      analyticsSubscriber: true,
      supplierKind: SupplierKind.MILL,
      verificationStatus: VerificationStatus.APPROVED,
      acronym: "NRL",
    },
    create: {
      legalName: "North Ridge Lumber",
      acronym: "NRL",
      verificationStatus: VerificationStatus.APPROVED,
      analyticsSubscriber: true,
      supplierKind: SupplierKind.MILL,
    },
  });

  const carrierCompany = await prisma.company.upsert({
    where: { legalName: "Blue Ox Transport" },
    update: {
      analyticsSubscriber: true,
      verificationStatus: VerificationStatus.APPROVED,
      carrierType: CarrierType.ASSET_BASED,
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

  // Demo booked load (shows on Shipments, not the open board).
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
      equipmentType: "SB",
      isRush: true,
      offeredRateUsd: 3200,
      marketRateUsd: 3050,
      shipperCompanyId: shipperCompany.id,
      createdByUserId: shipperUser.id,
      uniquePickupCode: "AX74Q1",
      requestedPickupAt: pu1,
      extendedPosting: {
        lumber: {
          productCategory: "DIMENSIONAL",
          species: "DF",
          dryness: "KD",
          treatment: "NONE",
          fragile: false,
          weatherSensitive: false,
        },
      },
      ...lumberSpecToLoadColumns({
        productCategory: "DIMENSIONAL",
        species: "DF",
        dryness: "KD",
        treatment: "NONE",
        fragile: false,
        weatherSensitive: false,
      }),
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
      equipmentType: "SB",
      isRush: true,
      offeredRateUsd: 3200,
      marketRateUsd: 3050,
      shipperCompanyId: shipperCompany.id,
      createdByUserId: shipperUser.id,
      uniquePickupCode: "AX74Q1",
      requestedPickupAt: pu1,
      extendedPosting: {
        lumber: {
          productCategory: "DIMENSIONAL",
          species: "DF",
          dryness: "KD",
          treatment: "NONE",
        },
      },
      ...lumberSpecToLoadColumns({
        productCategory: "DIMENSIONAL",
        species: "DF",
        dryness: "KD",
        treatment: "NONE",
      }),
    },
  });

  const openLoads: SeedLoadRow[] = [
    {
      ref: "LOB-SEED-0002",
      originCity: "Eugene",
      originState: "OR",
      originZip: "97401",
      destinationCity: "Phoenix",
      destinationState: "AZ",
      destinationZip: "85001",
      weightLbs: 48000,
      equipmentType: "SB",
      isRush: true,
      offeredRateUsd: 3850,
      pickupDaysFromNow: 2,
      lumber: {
        productCategory: "DIMENSIONAL",
        species: "DF",
        dryness: "KD",
        treatment: "NONE",
        fragile: false,
        weatherSensitive: false,
      },
    },
    {
      ref: "LOB-SEED-0003",
      originCity: "Bellingham",
      originState: "WA",
      originZip: "98225",
      destinationCity: "Denver",
      destinationState: "CO",
      destinationZip: "80202",
      weightLbs: 44000,
      equipmentType: "Tri",
      isRush: false,
      offeredRateUsd: 4100,
      pickupDaysFromNow: 4,
      lumber: {
        productCategory: "PANELS",
        species: "SPF",
        panelType: "OSB",
        dryness: "KD",
        treatment: "NONE",
        weatherSensitive: true,
      },
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
      equipmentType: "MX",
      isRush: true,
      offeredRateUsd: 3400,
      pickupDaysFromNow: 3,
      lumber: {
        productCategory: "TIMBERS",
        species: "DF_LARCH",
        dryness: "GREEN",
        treatment: "NONE",
      },
    },
    {
      ref: "LOB-SEED-0005",
      originCity: "Tacoma",
      originState: "WA",
      originZip: "98402",
      destinationCity: "Salt Lake City",
      destinationState: "UT",
      destinationZip: "84101",
      weightLbs: 36000,
      equipmentType: "CW",
      isRush: false,
      offeredRateUsd: 2950,
      pickupDaysFromNow: 5,
      lumber: {
        productCategory: "MILLWORK",
        species: "WRC",
        dryness: "KD",
        treatment: "NONE",
        fragile: true,
      },
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
      equipmentType: "Tan",
      isRush: false,
      offeredRateUsd: 2800,
      pickupDaysFromNow: 6,
      lumber: {
        productCategory: "BUNDLES",
        species: "SPF",
        dryness: "KD",
        treatment: "NONE",
      },
    },
    {
      ref: "LOB-SEED-0007",
      originCity: "Vancouver",
      originState: "BC",
      originZip: "V6B1A1",
      destinationCity: "Calgary",
      destinationState: "AB",
      destinationZip: "T2P1J9",
      weightLbs: 45000,
      equipmentType: "SB",
      isRush: false,
      offeredRateUsd: 3600,
      offerCurrency: "CAD",
      pickupDaysFromNow: 7,
      lumber: {
        productCategory: "DIMENSIONAL",
        species: "HEM_FIR",
        dryness: "KD",
        treatment: "NONE",
      },
    },
  ];

  for (const row of openLoads) {
    await upsertPostedLoad(shipperCompany.id, shipperUser.id, row);
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
    openPostedLoads: openLoads.length,
    bookedDemoLoad: "LOB-SEED-0001",
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

