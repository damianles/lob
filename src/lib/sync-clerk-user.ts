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

  const user = await prisma.user.upsert({
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

  return { user, error: null };
}
