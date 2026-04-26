import { auth } from "@clerk/nextjs/server";
import { cookies, headers } from "next/headers";

import { prisma } from "@/lib/prisma";
import { syncClerkUserToDatabase } from "@/lib/sync-clerk-user";
import { VIEW_AS_COOKIE, decodeViewAsCookie, type ViewAsPayload } from "@/lib/view-as";

export type ActorContext = {
  userId: string | null;
  companyId: string | null;
  /** Effective role used for UI/UX branching — equals realRole unless an admin has activated view-as. */
  role: string | null;
  /** True role from the DB. Sensitive permission gates should always use this. */
  realRole: string | null;
  /** True company from the DB. */
  realCompanyId: string | null;
  /** Active simulated profile when admin is viewing as another role; null otherwise. */
  viewAs: ViewAsPayload | null;
  /** True when admin is currently impersonating a non-admin role for UX evaluation. */
  simulated: boolean;
};

export async function getActorContext(): Promise<ActorContext> {
  const h = await headers();

  const fallback: ActorContext = {
    userId: h.get("x-user-id"),
    companyId: h.get("x-company-id"),
    role: h.get("x-user-role"),
    realRole: h.get("x-user-role"),
    realCompanyId: h.get("x-company-id"),
    viewAs: null,
    simulated: false,
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

    const realRole = appUser.role;
    const realCompanyId = appUser.companyId;

    let viewAs: ViewAsPayload | null = null;
    let effectiveRole: string = realRole;

    // Honor the view-as cookie ONLY if the real user is an admin. This is the
    // single point of trust: a non-admin who crafts the cookie sees no effect.
    if (realRole === "ADMIN") {
      try {
        const c = await cookies();
        const raw = c.get(VIEW_AS_COOKIE)?.value ?? null;
        const decoded = decodeViewAsCookie(raw);
        if (decoded && decoded.role && decoded.role !== "ADMIN") {
          viewAs = decoded;
          effectiveRole = decoded.role;
        }
      } catch {
        viewAs = null;
      }
    }

    return {
      userId: appUser.id,
      companyId: realCompanyId,
      role: effectiveRole,
      realRole,
      realCompanyId,
      viewAs,
      simulated: viewAs !== null,
    };
  } catch {
    return fallback;
  }
}
