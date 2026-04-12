/**
 * Merge duplicate `User` rows that share the same email (case-insensitive), then promote to ADMIN.
 *
 * Why: Postgres `User.email` is unique but CASE-SENSITIVE, so `A@x.com` and `a@x.com` can both exist.
 * Clerk sync uses `upsert({ where: { authProviderId }})` — a stale row tied to the wrong Clerk ID can
 * block sign-in. This script keeps one survivor per email, re-points loads/dispatch FKs, deletes extras.
 *
 * Usage:
 *   npx tsx scripts/setup-admins.ts a@x.com b@y.com
 *   npx tsx scripts/setup-admins.ts --dry-run a@x.com
 *
 * After this, optional: set LOB_AUTO_ADMIN_EMAILS in Vercel so every sign-in re-applies ADMIN (preview only).
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

import { Prisma } from "@prisma/client";
import { UserRole } from "@prisma/client";

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

type UserRow = {
  id: string;
  email: string;
  authProviderId: string | null;
  name: string;
  role: UserRole;
  companyId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function pickSurvivor(rows: UserRow[]): UserRow {
  const withAuth = rows.filter((r) => r.authProviderId != null && r.authProviderId !== "");
  if (withAuth.length > 1) {
    throw new Error(
      `Multiple users share this email and each has authProviderId — pick one in Clerk/DB manually:\n${withAuth
        .map((r) => `  ${r.id}  ${r.email}  ${r.authProviderId}`)
        .join("\n")}`,
    );
  }
  if (withAuth.length === 1) return withAuth[0];
  return [...rows].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0];
}

async function main() {
  loadEnvFiles();
  const { prisma } = await import("../src/lib/prisma");

  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const emails = args.filter((a) => a !== "--dry-run");

  if (!emails.length) {
    console.error('Usage: npx tsx scripts/setup-admins.ts [--dry-run] <email> [email ...]');
    process.exit(1);
  }

  const normalized = emails.map((e) => e.trim().toLowerCase()).filter(Boolean);

  for (const canonical of normalized) {
    const rows = await prisma.$queryRaw<UserRow[]>(
      Prisma.sql`
        SELECT id, email, "authProviderId", name, role, "companyId", "createdAt", "updatedAt"
        FROM "User"
        WHERE LOWER(email) = ${canonical}
      `,
    );

    if (rows.length === 0) {
      console.warn(`[skip] No User row for "${canonical}" — sign in once with Clerk (that email), then run again.`);
      continue;
    }

    if (rows.length > 1) {
      console.log(`[merge] ${rows.length} rows for email (case-insensitive) "${canonical}":`);
      for (const r of rows) {
        console.log(`        id=${r.id} email=${r.email} clerk=${r.authProviderId ?? "(null)"} role=${r.role}`);
      }
    }

    const survivor = pickSurvivor(rows);
    const duplicates = rows.filter((r) => r.id !== survivor.id);

    if (duplicates.length === 0) {
      console.log(`[ok] Single row for "${canonical}" — survivor ${survivor.id}`);
    } else {
      console.log(`[merge] Keeping survivor ${survivor.id} (${survivor.email}), removing ${duplicates.length} duplicate(s).`);
      if (!dryRun) {
        for (const d of duplicates) {
          const loads = await prisma.load.updateMany({
            where: { createdByUserId: d.id },
            data: { createdByUserId: survivor.id },
          });
          const disp = await prisma.dispatchLink.updateMany({
            where: { assignedByUserId: d.id },
            data: { assignedByUserId: survivor.id },
          });
          if (loads.count > 0 || disp.count > 0) {
            console.log(`       Reassigned loads=${loads.count} dispatchLinks=${disp.count} from ${d.id}`);
          }
          await prisma.user.delete({ where: { id: d.id } });
          console.log(`       Deleted duplicate user ${d.id}`);
        }
      } else {
        console.log(`       [dry-run] would reassign FKs and delete: ${duplicates.map((d) => d.id).join(", ")}`);
      }
    }

    if (!dryRun) {
      await prisma.user.update({
        where: { id: survivor.id },
        data: {
          email: canonical,
          role: UserRole.ADMIN,
          companyId: null,
        },
      });
      console.log(`[admin] ${canonical} → ADMIN (email normalized, company unlinked).`);
    } else {
      console.log(`[dry-run] would set ${survivor.id} → ADMIN, email=${canonical}, companyId=null`);
    }
  }

  if (dryRun) {
    console.log("\nDry run only — re-run without --dry-run to apply.");
  } else {
    console.log("\nDone. If sign-in still fails, align Clerk user ID: Clerk Dashboard → User → copy ID →");
    console.log(`  UPDATE "User" SET "authProviderId" = 'user_...' WHERE email = '...';`);
  }
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
