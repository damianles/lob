-- AlterTable
ALTER TABLE "Company" ADD COLUMN "acronym" VARCHAR(3);

-- CreateIndex
CREATE UNIQUE INDEX "Company_acronym_key" ON "Company"("acronym");

-- CreateTable
CREATE TABLE "LoadRefCounter" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "next" INTEGER NOT NULL DEFAULT 1000,

    CONSTRAINT "LoadRefCounter_pkey" PRIMARY KEY ("id")
);

INSERT INTO "LoadRefCounter" ("id", "next") VALUES ('global', 1000)
ON CONFLICT ("id") DO NOTHING;
