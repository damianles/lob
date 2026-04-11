import { auth, currentUser } from "@clerk/nextjs/server";
import { UserRole } from "@prisma/client";

import { prisma } from "@/lib/prisma";

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

  let user = await prisma.user.upsert({
    where: { authProviderId: userId },
    update: { email, name },
    create: {
      authProviderId: userId,
      email,
      name,
      role: UserRole.SHIPPER,
    },
    select: { id: true, companyId: true, role: true },
  });

  /** Preview / internal only: set LOB_AUTO_ADMIN_EMAIL to your Clerk email → always ADMIN on sign-in. Remove in production. */
  const autoAdmin = process.env.LOB_AUTO_ADMIN_EMAIL?.trim().toLowerCase();
  if (autoAdmin && email.toLowerCase() === autoAdmin) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { role: UserRole.ADMIN, companyId: null },
      select: { id: true, companyId: true, role: true },
    });
  }

  return { user, error: null };
}
