import Link from "next/link";

import { auth } from "@clerk/nextjs/server";

import { LobSidebar } from "@/components/lob-sidebar";
import { LobWoodOIcon } from "@/components/lob-wood-o-icon";
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
    <main className="min-h-[calc(100vh-3.5rem)] px-4 py-6 text-zinc-900 sm:px-6 sm:py-8">
      <div className="mx-auto flex max-w-[1680px] gap-0 overflow-hidden rounded-[1.25rem] border border-stone-200/35 bg-white shadow-[0_2px_40px_-12px_rgba(0,18,51,0.07)]">
        <LobSidebar active="onboarding" />
        <div className="min-w-0 flex-1 bg-stone-50/40 p-6 sm:p-10">
          <div className="mx-auto max-w-4xl">
            <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-8">
              <LobWoodOIcon className="h-16 w-16 shrink-0 drop-shadow-md sm:h-[4.5rem] sm:w-[4.5rem]" />
              <div className="min-w-0">
                <h1 className="text-3xl font-semibold tracking-tight text-lob-navy sm:text-4xl">Account setup</h1>
                <p className="mt-3 max-w-xl text-base leading-relaxed text-stone-500">
                  Register a mill or wholesaler to post loads, or a trucking company to book them. Carriers are usually
                  verified by admin before booking.
                </p>
              </div>
            </div>
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

            {userId && appUser?.role === "ADMIN" && (
              <section className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                <p className="font-semibold">Testing as supplier or carrier on this login</p>
                <p className="mt-1 leading-relaxed">
                  You can complete either form below even while signed in as an admin: we create the company and link{" "}
                  <strong>this</strong> Clerk user to it so you get the real posting / booking flow. To return to full
                  admin, open{" "}
                  <Link className="font-semibold underline" href="/admin/test-lab">
                    Admin → Test lab
                  </Link>{" "}
                  and choose <strong>Admin only (no company)</strong> (requires{" "}
                  <code className="rounded bg-white px-1 ring-1 ring-amber-200/80">
                    LOB_ALLOW_ADMIN_PERSONA_SWITCH=true
                  </code>{" "}
                  and seed data), or set{" "}
                  <code className="rounded bg-white px-1 ring-1 ring-amber-200/80">LOB_AUTO_ADMIN_EMAILS</code> to your
                  email so Test Lab keeps working after your role changes.
                </p>
                {personaSwitch && (
                  <p className="mt-2 text-amber-900/95">
                    Shortcut: Test lab can also attach you to seeded <strong>North Ridge</strong> (supplier) or{" "}
                    <strong>Blue Ox</strong> (carrier) without filling these forms.
                  </p>
                )}
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

