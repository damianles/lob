import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";
import { syncClerkUserToDatabase } from "@/lib/sync-clerk-user";
import { seedCompanyIdForViewAs } from "@/lib/simulated-actor-company";
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

const UNAUTHENTICATED: ActorContext = {
  userId: null,
  companyId: null,
  role: null,
  realRole: null,
  realCompanyId: null,
  viewAs: null,
  simulated: false,
};

export async function getActorContext(): Promise<ActorContext> {
  try {
    const session = await auth();
    if (!session.userId) {
      return UNAUTHENTICATED;
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
      return UNAUTHENTICATED;
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

    let companyId = realCompanyId;
    if (realRole === "ADMIN" && viewAs) {
      const simulatedCompanyId = await seedCompanyIdForViewAs(viewAs);
      if (simulatedCompanyId) {
        companyId = simulatedCompanyId;
      }
    }

    return {
      userId: appUser.id,
      companyId,
      role: effectiveRole,
      realRole,
      realCompanyId,
      viewAs,
      simulated: viewAs !== null,
    };
  } catch {
    return UNAUTHENTICATED;
  }
}
