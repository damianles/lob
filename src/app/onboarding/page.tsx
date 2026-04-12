import Link from "next/link";

import { auth } from "@clerk/nextjs/server";

import { LobBrandLockup } from "@/components/lob-brand-lockup";
import { LobSidebar } from "@/components/lob-sidebar";
import { getDatabaseErrorGuidance } from "@/lib/db-connection-hints";
import { isAdminPersonaSwitchEnabled } from "@/lib/admin-test-personas";
import { syncClerkUserToDatabase } from "@/lib/sync-clerk-user";

import { OnboardingForms } from "./ui";

export default async function OnboardingPage() {
  const { userId } = await auth();
  let profileSyncDbError: string | null = null;
  let clerkSyncError: "missing_email" | null = null;
  let appUser: { role: string; companyId: string | null } | null = null;

  try {
    if (userId) {
      const synced = await syncClerkUserToDatabase();
      clerkSyncError = synced.error;
      if (synced.user) {
        appUser = { role: synced.user.role, companyId: synced.user.companyId };
      }
    }
  } catch (e) {
    profileSyncDbError = e instanceof Error ? e.message : "Database error";
    console.error("[onboarding] profile sync error:", e);
  }

  const carrierAutoApprove = process.env.LOB_AUTO_APPROVE_CARRIERS === "true";
  const personaSwitch = isAdminPersonaSwitchEnabled();

  return (
    <main className="min-h-[calc(100vh-3.5rem)] p-3 text-zinc-900 sm:p-4">
      <div className="mx-auto flex max-w-[1600px] gap-0 overflow-hidden rounded-2xl border border-stone-200/70 bg-white/95 shadow-[0_8px_40px_-12px_rgba(0,18,51,0.1)] ring-1 ring-stone-900/[0.03] backdrop-blur-sm">
        <LobSidebar active="onboarding" />
        <div className="min-w-0 flex-1 bg-zinc-50/80 p-4 sm:p-6">
          <div className="mx-auto max-w-4xl">
            <LobBrandLockup className="relative mb-5 h-36 w-full max-w-lg sm:h-40" priority />
            <h1 className="text-2xl font-bold sm:text-3xl">Account setup</h1>
            <p className="mt-2 text-sm text-zinc-600">
              Register a mill / wholesaler to post loads, or a trucking company to book them. Carriers are usually
              verified by admin before booking.
            </p>
            {profileSyncDbError && (
              <section className="mt-4 rounded-lg border border-red-300 bg-red-50 p-4 text-red-950">
                <h2 className="text-lg font-semibold">Could not sync your account</h2>
                {(() => {
                  const g = getDatabaseErrorGuidance(profileSyncDbError);
                  return (
                    <>
                      <p className="mt-2 text-sm">{g.title}</p>
                      <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
                        {g.body.map((line, i) => (
                          <li key={i}>{line}</li>
                        ))}
                      </ul>
                      <p className="mt-3 text-sm">
                        <Link className="font-semibold underline" href="/api/health">
                          Check /api/health
                        </Link>
                      </p>
                      <p className="mt-2 font-mono text-[11px] opacity-80">{profileSyncDbError}</p>
                    </>
                  );
                })()}
              </section>
            )}

            {userId && clerkSyncError === "missing_email" && !profileSyncDbError && (
              <section className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-950">
                <h2 className="font-semibold">Account email required</h2>
                <p className="mt-1 text-sm">
                  Clerk did not return a primary email, so LOB cannot create your database profile. Add an email in your
                  Clerk user and refresh this page.
                </p>
              </section>
            )}

            {userId && appUser?.role === "ADMIN" && personaSwitch && (
              <section className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
                <p className="font-medium">Testing supplier and carrier flows</p>
                <p className="mt-1">
                  Use{" "}
                  <Link className="font-semibold underline" href="/admin/test-lab">
                    Admin → Test lab
                  </Link>{" "}
                  to attach your user to seeded North Ridge (supplier) or Blue Ox (carrier) without replacing your admin
                  account permanently.
                </p>
              </section>
            )}

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

