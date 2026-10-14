import { redirect } from "next/navigation";

import { LobBrandStrip } from "@/components/lob-brand-strip";
import { LobSidebar } from "@/components/lob-sidebar";
import { signInUrlForAppPath } from "@/lib/guest-auth-routes";
import { getNotificationSettings, NotificationContactError } from "@/lib/notifications/contacts";
import { getActorContext } from "@/lib/request-context";

import { NotificationSettingsForm } from "./notification-settings-form";

export const dynamic = "force-dynamic";

export default async function NotificationSettingsPage() {
  const actor = await getActorContext();
  if (!actor.clerkUserId) {
    redirect(signInUrlForAppPath("/settings/notifications"));
  }
  if (!actor.userId || !actor.companyId) {
    redirect("/onboarding");
  }
  if (actor.role !== "SHIPPER" && actor.role !== "DISPATCHER" && actor.role !== "ADMIN") {
    redirect("/");
  }

  let settings: Awaited<ReturnType<typeof getNotificationSettings>>;
  try {
    settings = await getNotificationSettings(actor.companyId);
  } catch (e) {
    if (e instanceof NotificationContactError) {
      return (
        <main className="mx-auto max-w-lg p-8">
          <h1 className="text-xl font-bold">Email alerts</h1>
          <p className="mt-2 text-sm text-zinc-600">{e.message}</p>
        </main>
      );
    }
    throw e;
  }

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-zinc-100 p-3 text-zinc-900 sm:p-4">
      <div className="mx-auto flex max-w-[1600px] gap-0 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
        <LobSidebar active="notifications" />
        <div className="min-w-0 flex-1 bg-zinc-50">
          <LobBrandStrip />
          <div className="p-4 sm:p-6">
            <div className="mx-auto max-w-3xl">
              <h1 className="text-2xl font-bold sm:text-3xl">Email alerts</h1>
              <p className="mt-2 text-sm text-zinc-600">
                {settings.companyName}. The sign-up email is always listed. Extra addresses get mail only after they
                confirm. Each address has its own switches. Checked items are on by default.
              </p>
              <div className="mt-6">
                <NotificationSettingsForm initial={settings} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
