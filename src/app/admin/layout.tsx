import { redirect } from "next/navigation";

import { isRealAdmin } from "@/lib/actor-permissions";
import { getActorContext } from "@/lib/request-context";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const actor = await getActorContext();
  if (!actor.clerkUserId) {
    redirect("/sign-in?redirect_url=/admin");
  }
  if (!actor.userId) {
    redirect("/onboarding");
  }
  if (!isRealAdmin(actor)) {
    redirect("/");
  }
  // When an admin is simulating another persona, treat admin routes as out-of-bounds
  // so the UX matches what that persona can actually access.
  if (actor.simulated) {
    redirect("/");
  }
  return <>{children}</>;
}
