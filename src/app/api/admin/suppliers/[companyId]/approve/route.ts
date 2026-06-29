import { VerificationStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { updateCompanyVerificationStatus } from "@/lib/admin-company-verification";
import { getActorContext } from "@/lib/request-context";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ companyId: string }> },
) {
  const actor = await getActorContext();
  if (actor.realRole !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const { companyId } = await ctx.params;
  const result = await updateCompanyVerificationStatus(
    companyId,
    VerificationStatus.APPROVED,
    "supplier",
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ data: result.data });
}
