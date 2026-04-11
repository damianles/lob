import Image from "next/image";

import { LobSidebar } from "@/components/lob-sidebar";
import { syncClerkUserToDatabase } from "@/lib/sync-clerk-user";

import { OnboardingForms } from "./ui";

export default async function OnboardingPage() {
  await syncClerkUserToDatabase();

  const carrierAutoApprove = process.env.LOB_AUTO_APPROVE_CARRIERS === "true";

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-zinc-100 p-3 text-zinc-900 sm:p-4">
      <div className="mx-auto flex max-w-[1600px] gap-0 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
        <LobSidebar active="onboarding" />
        <div className="min-w-0 flex-1 bg-zinc-50 p-4 sm:p-6">
          <div className="mx-auto max-w-4xl">
            <Image
              src="/brand/approved/lob-wordmark-approved.png"
              alt="LOB Lumber One Board"
              width={420}
              height={150}
              className="mb-4 rounded bg-white p-2"
              priority
            />
            <h1 className="text-2xl font-bold sm:text-3xl">Account setup</h1>
            <p className="mt-2 text-sm text-zinc-600">
              Register a mill / wholesaler to post loads, or a trucking company to book them. Carriers are usually
              verified by admin before booking.
            </p>
            {carrierAutoApprove && (
              <p className="mt-2 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-950">
                <strong>Preview mode:</strong> this server has <code className="rounded bg-sky-100 px-1">LOB_AUTO_APPROVE_CARRIERS=true</code>{" "}
                — new trucking companies are approved immediately so you can book without the admin queue.
              </p>
            )}
            <OnboardingForms />
          </div>
        </div>
      </div>
    </main>
  );
}

