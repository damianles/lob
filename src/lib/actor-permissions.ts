import type { ActorContext } from "@/lib/request-context";

/** DB truth; not affected by admin “view as” simulation. */
export function isRealAdmin(actor: Pick<ActorContext, "realRole">): boolean {
  return actor.realRole === "ADMIN";
}

/**
 * When to show the global admin bar (Carriers, Companies, etc.): only for real
 * admins who are not currently simulating another role.
 */
export function shouldShowGlobalAdminBar(
  me: { realRole: string | null; viewAs: unknown } | null | undefined,
): boolean {
  if (!me) return false;
  return me.realRole === "ADMIN" && me.viewAs == null;
}
