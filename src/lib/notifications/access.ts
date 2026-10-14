import { getActorContext, type ActorContext } from "@/lib/request-context";

export async function requireNotificationCompany(): Promise<
  { actor: ActorContext & { userId: string; companyId: string } } | { error: string; status: number }
> {
  const actor = await getActorContext();
  if (!actor.userId) return { error: "Sign in required.", status: 401 };
  if (!actor.companyId) return { error: "Finish account setup before managing alerts.", status: 403 };
  if (actor.role !== "SHIPPER" && actor.role !== "DISPATCHER" && actor.role !== "ADMIN") {
    return { error: "Supplier and carrier accounts can manage alerts.", status: 403 };
  }
  return { actor: actor as ActorContext & { userId: string; companyId: string } };
}
