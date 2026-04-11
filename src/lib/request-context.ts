import { auth } from "@clerk/nextjs/server";
import { headers } from "next/headers";

import { prisma } from "@/lib/prisma";
import { syncClerkUserToDatabase } from "@/lib/sync-clerk-user";

type ActorContext = {
  userId: string | null;
  companyId: string | null;
  role: string | null;
};

export async function getActorContext(): Promise<ActorContext> {
  const h = await headers();

  // Temporary header fallback for local MVP testing before full role UI is wired.
  const fallback = {
    userId: h.get("x-user-id"),
    companyId: h.get("x-company-id"),
    role: h.get("x-user-role"),
  };

  try {
    const session = await auth();
    if (!session.userId) {
      return fallback;
    }

    let appUser = await prisma.user.findUnique({
      where: { authProviderId: session.userId },
      select: {
        id: true,
        role: true,
        companyId: true,
      },
    });

    if (!appUser) {
      const synced = await syncClerkUserToDatabase();
      if (synced.user) {
        appUser = synced.user;
      }
    }

    if (!appUser) {
      return fallback;
    }

    return {
      userId: appUser.id,
      companyId: appUser.companyId,
      role: appUser.role,
    };
  } catch {
    return fallback;
  }
}

