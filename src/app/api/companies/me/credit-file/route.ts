import { NextResponse } from "next/server";
import { z } from "zod";

import { CREDIT_FILE_KINDS, getCreditFileView } from "@/lib/credit-file";
import { isHttpsUrl } from "@/lib/marketplace-gates";
import { prisma } from "@/lib/prisma";
import { getActorContext } from "@/lib/request-context";

const httpsUrl = z.string().url().refine(isHttpsUrl, "Must be a full https:// link");

const packetSchema = z
  .object({
    w9Url: httpsUrl.optional(),
    businessRegistrationUrl: httpsUrl.optional(),
    creditReferenceUrl: httpsUrl,
    insuranceUrl: httpsUrl.optional(),
    insuranceExpiresAt: z.string().datetime().optional(),
  })
  .refine((d) => Boolean(d.w9Url || d.businessRegistrationUrl), {
    message: "Provide a W-9 and/or business registration upload.",
    path: ["w9Url"],
  });

export async function GET() {
  const actor = await getActorContext();
  if (!actor.companyId) {
    return NextResponse.json({ error: "Link a company first." }, { status: 400 });
  }
  const file = await getCreditFileView(actor.companyId, null);
  return NextResponse.json({ data: file });
}

export async function POST(req: Request) {
  const actor = await getActorContext();
  if (!actor.companyId || (actor.role !== "SHIPPER" && actor.role !== "DISPATCHER" && actor.role !== "ADMIN")) {
    return NextResponse.json({ error: "Link a company first." }, { status: 400 });
  }

  const parsed = packetSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const isCarrier = actor.role === "DISPATCHER";
  if (isCarrier && (!parsed.data.insuranceUrl || !parsed.data.insuranceExpiresAt)) {
    return NextResponse.json({ error: "Carriers must file insurance and an expiry date." }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.company.update({
      where: { id: actor.companyId! },
      data: {
        creditReviewAuthorized: true,
        creditDocsVerifiedAt: null,
      },
    });
    await tx.document.deleteMany({
      where: {
        companyId: actor.companyId!,
        dispatchLinkId: null,
        kind: { in: [...CREDIT_FILE_KINDS] },
      },
    });
    const rows: { companyId: string; kind: string; fileUrl: string; expiresAt?: Date }[] = [
      { companyId: actor.companyId!, kind: "CREDIT_REFERENCE", fileUrl: parsed.data.creditReferenceUrl },
    ];
    if (parsed.data.w9Url) {
      rows.push({ companyId: actor.companyId!, kind: "W9", fileUrl: parsed.data.w9Url });
    }
    if (parsed.data.businessRegistrationUrl) {
      rows.push({
        companyId: actor.companyId!,
        kind: "BUSINESS_REGISTRATION",
        fileUrl: parsed.data.businessRegistrationUrl,
      });
    }
    if (isCarrier && parsed.data.insuranceUrl && parsed.data.insuranceExpiresAt) {
      rows.push({
        companyId: actor.companyId!,
        kind: "INSURANCE",
        fileUrl: parsed.data.insuranceUrl,
        expiresAt: new Date(parsed.data.insuranceExpiresAt),
      });
    }
    await tx.document.createMany({ data: rows });
  });

  const file = await getCreditFileView(actor.companyId, null);
  return NextResponse.json({ data: file });
}
