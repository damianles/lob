import { UserRole } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const select = { id: true, companyId: true, role: true } as const;

/**
 * Links Clerk to an existing `User` row when `email` already exists (e.g. admin setup, seed)
 * but `authProviderId` was null or pointed at another Clerk user. A plain
 * `upsert({ where: { authProviderId }})` would try to `create` and hit the unique `email` constraint.
 */
export async function upsertUserFromClerk(params: {
  clerkUserId: string;
  email: string;
  name: string;
  defaultRole?: UserRole;
}): Promise<{ id: string; companyId: string | null; role: UserRole }> {
  const { clerkUserId, email, name, defaultRole = UserRole.SHIPPER } = params;

  const byAuth = await prisma.user.findUnique({
    where: { authProviderId: clerkUserId },
    select: { id: true },
  });
  if (byAuth) {
    return prisma.user.update({
      where: { id: byAuth.id },
      data: { email, name },
      select,
    });
  }

  const byEmail = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (byEmail) {
    return prisma.user.update({
      where: { id: byEmail.id },
      data: { authProviderId: clerkUserId, name },
      select,
    });
  }

  return prisma.user.create({
    data: {
      authProviderId: clerkUserId,
      email,
      name,
      role: defaultRole,
    },
    select,
  });
}
