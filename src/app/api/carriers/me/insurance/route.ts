import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getActorContext } from "@/lib/request-context";
import { insuranceUploadSchema } from "@/lib/validation";

export async function GET() {
  const actor = await getActorContext();
  if (!actor.companyId) {
    return NextResponse.json({ error: "No company linked to current user." }, { status: 400 });
  }

  const latest = await prisma.document.findFirst({
    where: {
      companyId: actor.companyId,
      kind: "INSURANCE",
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: latest });
}

export async function POST(req: Request) {
  const actor = await getActorContext();
  if (!actor.companyId) {
    return NextResponse.json({ error: "No company linked to current user." }, { status: 400 });
  }
  if (actor.role !== "DISPATCHER" && actor.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Only dispatcher/admin can upload insurance documents." },
      { status: 403 },
    );
  }

  const body = await req.json();
  const parsed = insuranceUploadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const created = await prisma.document.create({
    data: {
      companyId: actor.companyId,
      kind: "INSURANCE",
      fileUrl: parsed.data.fileUrl,
      expiresAt: new Date(parsed.data.expiresAt),
    },
  });

  return NextResponse.json({ data: created }, { status: 201 });
}

