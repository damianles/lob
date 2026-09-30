import { NextResponse } from "next/server";

import { companiesShareBooking, getCreditFileView } from "@/lib/credit-file";
import { prisma } from "@/lib/prisma";
import { getActorContext } from "@/lib/request-context";

type Params = { params: Promise<{ companyId: string }> };

async function viewerMayOpen(subjectCompanyId: string, actorCompanyId: string, isAdmin: boolean) {
  if (isAdmin) return true;
  if (actorCompanyId === subjectCompanyId) return false;
  return companiesShareBooking(actorCompanyId, subjectCompanyId);
}

export async function GET(_req: Request, { params }: Params) {
  const { companyId } = await params;
  const actor = await getActorContext();
  if (!actor.userId || !actor.companyId) {
    return NextResponse.json({ error: "Sign in with a company account." }, { status: 401 });
  }
  const isAdmin = actor.role === "ADMIN";
  if (!(await viewerMayOpen(companyId, actor.companyId, isAdmin))) {
    return NextResponse.json({ error: "Credit files open after you book with this company." }, { status: 403 });
  }
  const file = await getCreditFileView(companyId, actor.companyId);
  if (!file) return NextResponse.json({ error: "Company not found." }, { status: 404 });
  return NextResponse.json({ data: file });
}

export async function POST(_req: Request, { params }: Params) {
  const { companyId } = await params;
  const actor = await getActorContext();
  if (!actor.userId || !actor.companyId || actor.role === "ADMIN") {
    return NextResponse.json({ error: "Sign in as the mill or carrier reviewing this file." }, { status: 401 });
  }
  if (!(await viewerMayOpen(companyId, actor.companyId, false))) {
    return NextResponse.json({ error: "Credit files open after you book with this company." }, { status: 403 });
  }

  const subject = await prisma.company.findUnique({
    where: { id: companyId },
    select: { creditReviewAuthorized: true },
  });
  if (!subject?.creditReviewAuthorized) {
    return NextResponse.json({ error: "This company has not filed a credit packet." }, { status: 400 });
  }

  const review = await prisma.creditFileReview.upsert({
    where: {
      reviewerCompanyId_subjectCompanyId: {
        reviewerCompanyId: actor.companyId,
        subjectCompanyId: companyId,
      },
    },
    update: {},
    create: {
      reviewerCompanyId: actor.companyId,
      subjectCompanyId: companyId,
    },
    select: { createdAt: true },
  });

  return NextResponse.json({ data: { reviewedAt: review.createdAt.toISOString() } });
}
