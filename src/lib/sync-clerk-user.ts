import { auth, currentUser } from "@clerk/nextjs/server";
import { UserRole } from "@prisma/client";

import { isAdminPersonaSwitchEnabled } from "@/lib/admin-test-personas";
import { upsertUserFromClerk } from "@/lib/clerk-user-merge";
import { prisma } from "@/lib/prisma";

/** Comma- or semicolon-separated list; also honors legacy LOB_AUTO_ADMIN_EMAIL. Preview/staging only. */
export function parseAutoAdminEmails(): Set<string> {
  const set = new Set<string>();
  const list = process.env.LOB_AUTO_ADMIN_EMAILS?.split(/[,;]/).map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (list) {
    for (const e of list) set.add(e);
  }
  const single = process.env.LOB_AUTO_ADMIN_EMAIL?.trim().toLowerCase();
  if (single) set.add(single);
  return set;
}

/**
 * Ensures a Prisma `User` row exists for the current Clerk session.
 * Use when webhooks are missing or delayed (common on first Vercel deploy).
 */
export async function syncClerkUserToDatabase(): Promise<{
  user: { id: string; companyId: string | null; role: UserRole } | null;
  error: "missing_email" | null;
}> {
  const { userId } = await auth();
  if (!userId) {
    return { user: null, error: null };
  }

  const cu = await currentUser();
  const email =
    cu?.emailAddresses.find((e) => e.id === cu.primaryEmailAddressId)?.emailAddress ?? null;
  const name =
    [cu?.firstName, cu?.lastName].filter(Boolean).join(" ").trim() ||
    cu?.username ||
    "LOB User";

  if (!email) {
    return { user: null, error: "missing_email" };
  }

  let user = await upsertUserFromClerk({
    clerkUserId: userId,
    email,
    name,
    defaultRole: UserRole.SHIPPER,
  });

  /**
   * Preview / internal only: LOB_AUTO_ADMIN_EMAILS or LOB_AUTO_ADMIN_EMAIL → ADMIN.
   * When LOB_ALLOW_ADMIN_PERSONA_SWITCH=true, do not reset users who are testing as a shipper or carrier
   * (they have a companyId). Fresh accounts (no company) still become ADMIN.
   */
  if (parseAutoAdminEmails().has(email.toLowerCase())) {
    const personaSwitch = isAdminPersonaSwitchEnabled();
    if (personaSwitch) {
      const row = await prisma.user.findUnique({
        where: { id: user.id },
        select: { companyId: true, role: true },
      });
      if (row?.companyId != null) {
        return { user: { id: user.id, companyId: row.companyId, role: row.role }, error: null };
      }
    }
    user = await prisma.user.update({
      where: { id: user.id },
      data: { role: UserRole.ADMIN, companyId: null },
      select: { id: true, companyId: true, role: true },
    });
  }

  return { user, error: null };
}
