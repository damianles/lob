import { redirect } from "next/navigation";

import { getActorContext } from "@/lib/request-context";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const actor = await getActorContext();
  if (actor.realRole !== "ADMIN") {
    redirect("/");
  }
  return <>{children}</>;
}
