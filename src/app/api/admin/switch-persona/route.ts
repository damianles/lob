import { auth, currentUser } from "@clerk/nextjs/server";
import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";

import {
  isAdminPersonaSwitchEnabled,
  SEED_CARRIER_COMPANY_NAME,
  SEED_SHIPPER_COMPANY_NAME,
} from "@/lib/admin-test-personas";
import { prisma } from "@/lib/prisma";
import { parseAutoAdminEmails, syncClerkUserToDatabase } from "@/lib/sync-clerk-user";

const TARGETS = ["ADMIN", "SHIPPER_DEMO", "DISPATCHER_DEMO"] as const;
type Target = (typeof TARGETS)[number];

export async function POST(req: Request) {
  if (!isAdminPersonaSwitchEnabled()) {
    return NextResponse.json(
      {
        error:
          "Persona switching is disabled. Set LOB_ALLOW_ADMIN_PERSONA_SWITCH=true (preview/staging only).",
      },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const target = (body as { target?: string })?.target;
  if (!TARGETS.includes(target as Target)) {
    return NextResponse.json(
      { error: `target must be one of: ${TARGETS.join(", ")}` },
      { status: 400 },
    );
  }

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await syncClerkUserToDatabase();

  const appUser = await prisma.user.findUnique({
    where: { authProviderId: userId },
    select: { id: true, role: true, email: true },
  });
  if (!appUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const cu = await currentUser();
  const clerkEmail =
    cu?.emailAddresses.find((e) => e.id === cu.primaryEmailAddressId)?.emailAddress?.toLowerCase() ?? null;

  const onAdminAllowlist =
    (clerkEmail && parseAutoAdminEmails().has(clerkEmail)) ||
    parseAutoAdminEmails().has(appUser.email.toLowerCase());

  const allowed = appUser.role === UserRole.ADMIN || onAdminAllowlist;
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (target === "ADMIN") {
    const updated = await prisma.user.update({
      where: { id: appUser.id },
      data: { role: UserRole.ADMIN, companyId: null },
      select: { id: true, role: true, companyId: true },
    });
    return NextResponse.json({ ok: true, user: updated });
  }

  if (target === "SHIPPER_DEMO") {
    const co = await prisma.company.findUnique({
      where: { legalName: SEED_SHIPPER_COMPANY_NAME },
      select: { id: true },
    });
    if (!co) {
      return NextResponse.json(
        {
          error: `Seed company "${SEED_SHIPPER_COMPANY_NAME}" not found. Run npm run db:seed on this database.`,
        },
        { status: 404 },
      );
    }
    const updated = await prisma.user.update({
      where: { id: appUser.id },
      data: { role: UserRole.SHIPPER, companyId: co.id },
      select: { id: true, role: true, companyId: true },
    });
    return NextResponse.json({ ok: true, user: updated });
  }

  const co = await prisma.company.findUnique({
    where: { legalName: SEED_CARRIER_COMPANY_NAME },
    select: { id: true },
  });
  if (!co) {
    return NextResponse.json(
      {
        error: `Seed company "${SEED_CARRIER_COMPANY_NAME}" not found. Run npm run db:seed on this database.`,
      },
      { status: 404 },
    );
  }
  const updated = await prisma.user.update({
    where: { id: appUser.id },
    data: { role: UserRole.DISPATCHER, companyId: co.id },
    select: { id: true, role: true, companyId: true },
  });
  return NextResponse.json({ ok: true, user: updated });
}
