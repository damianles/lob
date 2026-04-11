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
              src="/brand/final/lob-horizontal-final.svg"
              alt="Lumber One Board"
              width={560}
              height={121}
              className="mb-4 h-auto w-full max-w-lg"
              priority
            />
            <h1 className="text-2xl font-bold sm:text-3xl">Account setup</h1>
            <p className="mt-2 text-sm text-zinc-600">
              Register a mill / wholesaler to post loads, or a trucking company to book them. Carriers are usually
              verified by admin before booking.
            </p>
            {carrierAutoApprove && (
              <p className="mt-2 rounded-md border border-lob-gold/40 bg-lob-paper px-3 py-2 text-sm text-lob-navy">
                <strong>Preview mode:</strong> this server has <code className="rounded bg-white px-1 ring-1 ring-stone-200">LOB_AUTO_APPROVE_CARRIERS=true</code>{" "}
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

