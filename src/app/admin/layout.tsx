import { redirect } from "next/navigation";

import { isRealAdmin } from "@/lib/actor-permissions";
import { getActorContext } from "@/lib/request-context";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const actor = await getActorContext();
  if (!actor.userId) {
    redirect("/sign-in");
  }
  if (!isRealAdmin(actor)) {
    redirect("/");
  }
  return <>{children}</>;
}
