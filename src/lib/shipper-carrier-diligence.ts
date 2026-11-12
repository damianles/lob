import { LoadBidStatus, VerificationStatus } from "@prisma/client";

import { buildCompliancePassport } from "@/components/carrier-scorecard";
import { getCarrierInsuranceStatus } from "@/lib/carrier-insurance";
import { getCarrierPerformanceStats } from "@/lib/carrier-performance";
import { companiesShareBooking, getCreditFileView } from "@/lib/credit-file";
import { prisma } from "@/lib/prisma";

export async function shipperMayViewCarrierDiligence(
  shipperCompanyId: string,
  carrierCompanyId: string,
): Promise<boolean> {
  const carrier = await prisma.company.findUnique({
    where: { id: carrierCompanyId },
    select: { verificationStatus: true, carrierType: true },
  });
  if (!carrier || carrier.verificationStatus !== VerificationStatus.APPROVED || !carrier.carrierType) {
    return false;
  }
  return true;
}

export async function shipperMayOpenCarrierCreditFile(
  shipperCompanyId: string,
  carrierCompanyId: string,
): Promise<boolean> {
  if (await companiesShareBooking(shipperCompanyId, carrierCompanyId)) return true;
  const pending = await prisma.loadBid.findFirst({
    where: {
      carrierCompanyId,
      status: LoadBidStatus.PENDING,
      load: { shipperCompanyId, status: "POSTED" },
    },
    select: { id: true },
  });
  return Boolean(pending);
}

/** Scorecard pack for prefs + Accept/Decline. Credit URLs only when relationship allows. */
export async function buildShipperCarrierDiligence(args: {
  shipperCompanyId: string;
  carrierCompanyId: string;
  includeCreditFile: boolean;
}) {
  const company = await prisma.company.findUnique({
    where: { id: args.carrierCompanyId },
    select: {
      id: true,
      legalName: true,
      dotNumber: true,
      mcNumber: true,
      carrierType: true,
      isOwnerOperator: true,
      fleetTruckCount: true,
      fleetTrailerCount: true,
      trailerEquipmentTypes: true,
      carrierProfileBlurb: true,
      verificationStatus: true,
      reliabilityScore: true,
      authorityRegion: true,
      insuranceCoverageVerifiedAt: true,
    },
  });
  if (!company) return null;

  const [docs, insurance, performance] = await Promise.all([
    prisma.document.findMany({
      where: { companyId: company.id, dispatchLinkId: null },
      orderBy: { createdAt: "desc" },
      take: 40,
      select: { kind: true, expiresAt: true },
    }),
    getCarrierInsuranceStatus(company.id),
    getCarrierPerformanceStats(company.id),
  ]);

  const passport = buildCompliancePassport({
    docs,
    insurance,
    authorityRegion: company.authorityRegion,
  });

  let creditFile = null;
  if (args.includeCreditFile) {
    const allowed = await shipperMayOpenCarrierCreditFile(args.shipperCompanyId, company.id);
    if (allowed) {
      creditFile = await getCreditFileView(company.id, args.shipperCompanyId);
    }
  }

  return {
    carrier: {
      id: company.id,
      legalName: company.legalName,
      dotNumber: company.dotNumber,
      mcNumber: company.mcNumber,
      carrierType: company.carrierType,
      isOwnerOperator: company.isOwnerOperator,
      fleetTruckCount: company.fleetTruckCount,
      fleetTrailerCount: company.fleetTrailerCount,
      trailerEquipmentTypes: company.trailerEquipmentTypes,
      carrierProfileBlurb: company.carrierProfileBlurb,
      verificationStatus: company.verificationStatus,
      reliabilityScore: company.reliabilityScore,
    },
    passport,
    insurance: {
      current: insurance.current,
      expiringSoon: insurance.expiringSoon,
      expiresAt: insurance.expiresAt?.toISOString() ?? null,
      cargoCoverageUsd: insurance.cargoCoverageUsd != null ? Number(insurance.cargoCoverageUsd) : null,
      autoLiabilityCoverageUsd:
        insurance.autoLiabilityCoverageUsd != null ? Number(insurance.autoLiabilityCoverageUsd) : null,
      coverageVerified: Boolean(company.insuranceCoverageVerifiedAt),
    },
    performance,
    creditFile,
    creditFileAvailable: Boolean(creditFile),
  };
}
