import { VerificationStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { getCarrierInsuranceStatus, INSURANCE_EXPIRY_WARN_DAYS } from "@/lib/carrier-insurance";
import { prisma } from "@/lib/prisma";
import { getActorContext } from "@/lib/request-context";

export async function GET(req: Request) {
  const actor = await getActorContext();
  if (actor.realRole !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const days = Math.max(
    1,
    Math.min(120, Number(searchParams.get("days") ?? String(INSURANCE_EXPIRY_WARN_DAYS))),
  );
  const now = new Date();

  const carriers = await prisma.company.findMany({
    where: {
      carrierType: { not: null },
      verificationStatus: { in: [VerificationStatus.APPROVED, VerificationStatus.PENDING] },
    },
    select: {
      id: true,
      legalName: true,
      verificationStatus: true,
      carrierType: true,
    },
    orderBy: { legalName: "asc" },
    take: 500,
  });

  const rows: {
    companyId: string;
    legalName: string;
    verificationStatus: VerificationStatus;
    carrierType: string | null;
    documentId: string | null;
    expiresAt: string | null;
    current: boolean;
    daysUntilExpiry: number | null;
    expiringSoon: boolean;
  }[] = [];

  for (const c of carriers) {
    const status = await getCarrierInsuranceStatus(c.id, now);
    if (!status.expiresAt && !status.documentId) {
      rows.push({
        companyId: c.id,
        legalName: c.legalName,
        verificationStatus: c.verificationStatus,
        carrierType: c.carrierType,
        documentId: null,
        expiresAt: null,
        current: false,
        daysUntilExpiry: null,
        expiringSoon: false,
      });
      continue;
    }
    const inWindow =
      !status.current ||
      (status.daysUntilExpiry != null && status.daysUntilExpiry <= days);
    if (!inWindow) continue;
    rows.push({
      companyId: c.id,
      legalName: c.legalName,
      verificationStatus: c.verificationStatus,
      carrierType: c.carrierType,
      documentId: status.documentId,
      expiresAt: status.expiresAt?.toISOString() ?? null,
      current: status.current,
      daysUntilExpiry: status.daysUntilExpiry,
      expiringSoon: status.expiringSoon,
    });
  }

  rows.sort((a, b) => {
    const ae = a.expiresAt ? new Date(a.expiresAt).getTime() : 0;
    const be = b.expiresAt ? new Date(b.expiresAt).getTime() : 0;
    return ae - be;
  });

  return NextResponse.json({
    data: rows,
    windowDays: days,
    counts: {
      listed: rows.length,
      alreadyExpired: rows.filter((r) => !r.current).length,
      expiringSoon: rows.filter((r) => r.expiringSoon).length,
    },
  });
}
