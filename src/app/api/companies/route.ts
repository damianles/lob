import { auth } from "@clerk/nextjs/server";
import { VerificationStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { companyOnboardingSchema } from "@/lib/validation";

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = companyOnboardingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const payload = parsed.data;
  const { userId: clerkUserId } = await auth();
  const signedInUser = clerkUserId
    ? await prisma.user.findUnique({
        where: { authProviderId: clerkUserId },
      })
    : null;

  if (signedInUser?.companyId) {
    return NextResponse.json({ error: "This user is already linked to a company." }, { status: 409 });
  }

  if (!signedInUser && !payload.userEmail) {
    return NextResponse.json(
      { error: "Email is required when creating a company without signed-in user." },
      { status: 400 },
    );
  }

  if (!signedInUser && !payload.userName) {
    return NextResponse.json(
      { error: "Name is required when creating a company without signed-in user." },
      { status: 400 },
    );
  }

  if (!signedInUser && payload.userEmail) {
    const existingUser = await prisma.user.findUnique({
      where: { email: payload.userEmail },
      select: { id: true },
    });
    if (existingUser) {
      return NextResponse.json({ error: "A user with this email already exists." }, { status: 409 });
    }
  }

  if (payload.role === "SHIPPER" && !payload.supplierKind) {
    return NextResponse.json(
      { error: "Supplier type is required (mill, wholesaler, or other lumber supplier)." },
      { status: 400 },
    );
  }

  if (payload.role === "DISPATCHER") {
    if (!payload.carrierType) {
      return NextResponse.json(
        { error: "Carrier type is required for carrier onboarding." },
        { status: 400 },
      );
    }
    if (!payload.dotNumber?.trim()) {
      return NextResponse.json({ error: "DOT number is required for carriers." }, { status: 400 });
    }
    if (!payload.mcNumber?.trim()) {
      return NextResponse.json({ error: "MC number is required for carriers." }, { status: 400 });
    }
  }

  const autoApproveCarriers = process.env.LOB_AUTO_APPROVE_CARRIERS === "true";

  const company = await prisma.company.create({
    data: {
      legalName: payload.legalName,
      dotNumber: payload.dotNumber,
      mcNumber: payload.mcNumber,
      carrierType: payload.carrierType,
      supplierKind: payload.role === "SHIPPER" ? payload.supplierKind : undefined,
      verificationStatus:
        payload.role === "SHIPPER"
          ? VerificationStatus.APPROVED
          : autoApproveCarriers
            ? VerificationStatus.APPROVED
            : VerificationStatus.PENDING,
    },
  });

  if (signedInUser) {
    await prisma.user.update({
      where: { id: signedInUser.id },
      data: {
        role: payload.role,
        companyId: company.id,
      },
    });
  } else {
    await prisma.user.create({
      data: {
        email: payload.userEmail!,
        name: payload.userName!,
        role: payload.role,
        companyId: company.id,
      },
    });
  }

  const companyWithUsers = await prisma.company.findUnique({
    where: { id: company.id },
    include: { users: true },
  });

  return NextResponse.json({ data: companyWithUsers }, { status: 201 });
}

