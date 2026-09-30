-- Credit file collected at signup. LOB stores the documents the company files.
-- It does not pull a credit bureau score.
ALTER TABLE "Company" ADD COLUMN "creditReviewAuthorized" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "CreditFileReview" (
    "id" TEXT NOT NULL,
    "reviewerCompanyId" TEXT NOT NULL,
    "subjectCompanyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditFileReview_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CreditFileReview_reviewerCompanyId_subjectCompanyId_key" ON "CreditFileReview"("reviewerCompanyId", "subjectCompanyId");
CREATE INDEX "CreditFileReview_subjectCompanyId_idx" ON "CreditFileReview"("subjectCompanyId");

ALTER TABLE "CreditFileReview" ADD CONSTRAINT "CreditFileReview_reviewerCompanyId_fkey" FOREIGN KEY ("reviewerCompanyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreditFileReview" ADD CONSTRAINT "CreditFileReview_subjectCompanyId_fkey" FOREIGN KEY ("subjectCompanyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
