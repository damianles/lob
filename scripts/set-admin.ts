/**
 * Promote a database user to ADMIN (full admin APIs + analytics + mill names on loads).
 *
 * Prerequisite: that person has signed in at least once so Clerk sync created their User row.
 *
 * Usage (local, against the same DB as production if you copy DATABASE_URL):
 *   npx tsx scripts/set-admin.ts you@yourdomain.com
 */
import { UserRole } from "@prisma/client";

import { prisma } from "../src/lib/prisma";

async function main() {
  const raw = process.argv[2]?.trim();
  if (!raw) {
    console.error("Usage: npx tsx scripts/set-admin.ts <email>");
    process.exit(1);
  }

  const user = await prisma.user.findFirst({
    where: { email: { equals: raw, mode: "insensitive" } },
  });

  if (!user) {
    console.error(
      `No user found with email matching "${raw}". Sign in to the app once with Clerk (same email), then run this again.`,
    );
    process.exit(1);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { role: UserRole.ADMIN, companyId: null },
  });

  console.log(`OK — ${user.email} is now ADMIN (company unlinked for ops account).`);
  console.log("To test posting loads as a mill, use Account setup with a second user or temporarily set role back.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
