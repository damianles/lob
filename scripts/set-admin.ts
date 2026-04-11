/**
 * Promote database user(s) to ADMIN (admin APIs, full visibility on loads, nav links).
 *
 * Prerequisite: each person has signed in at least once so Clerk sync created their User row.
 *
 * Usage:
 *   npx tsx scripts/set-admin.ts you@domain.com other@domain.com
 *   npx tsx scripts/set-admin.ts "a@x.com,b@y.com"
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

import { UserRole } from "@prisma/client";

/** Load .env.local / .env so DATABASE_URL is set when running outside `next dev`. */
function loadEnvFiles() {
  for (const name of [".env.local", ".env"]) {
    const p = path.join(process.cwd(), name);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf-8").split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq === -1) continue;
      const k = t.slice(0, eq).trim();
      let v = t.slice(eq + 1).trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      if (process.env[k] === undefined) process.env[k] = v;
    }
  }
}

function collectEmailsFromArgv(): string[] {
  return process.argv
    .slice(2)
    .flatMap((arg) => arg.split(/[,;]/))
    .map((s) => s.trim())
    .filter(Boolean);
}

async function main() {
  loadEnvFiles();
  const { prisma } = await import("../src/lib/prisma");

  const emails = collectEmailsFromArgv();
  if (!emails.length) {
    console.error("Usage: npx tsx scripts/set-admin.ts <email> [email ...]");
    console.error('       npx tsx scripts/set-admin.ts "a@x.com, b@y.com"');
    process.exit(1);
  }

  let ok = 0;
  for (const raw of emails) {
    const user = await prisma.user.findFirst({
      where: { email: { equals: raw, mode: "insensitive" } },
    });

    if (!user) {
      console.error(
        `[skip] No user "${raw}" — sign in to the app once with Clerk (that email), then run this again.`,
      );
      continue;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { role: UserRole.ADMIN, companyId: null },
    });

    console.log(`OK — ${user.email} is now ADMIN (company unlinked for ops account).`);
    ok += 1;
  }

  if (ok === 0) {
    process.exit(1);
  }
  console.log(`Done. ${ok} user(s) promoted.`);
  console.log("To post loads as a supplier, use Account setup with a separate user or a non-admin profile.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    const { prisma } = await import("../src/lib/prisma");
    await prisma.$disconnect();
  });
