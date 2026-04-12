import { auth } from "@clerk/nextjs/server";
import { LoadStatus, VerificationStatus, type Prisma } from "@prisma/client";
import Link from "next/link";

import { LandingEntry } from "@/components/landing-entry";
import { LoadBoardWorkspace, type BoardActor, type SerializableLoad } from "@/components/load-board-workspace";
import { prisma } from "@/lib/prisma";
import { carrierCompanyNameForViewer } from "@/lib/carrier-visibility";
import { shipperCompanyNameForViewer } from "@/lib/shipper-visibility";
import { getDatabaseErrorGuidance } from "@/lib/db-connection-hints";
import { syncClerkUserToDatabase } from "@/lib/sync-clerk-user";

export const dynamic = "force-dynamic";

const loadBoardInclude = {
  booking: { include: { carrierCompany: true } },
  dispatchLink: { select: { token: true, status: true } },
  shipperCompany: { select: { legalName: true } },
} satisfies Prisma.LoadInclude;

type LoadRow = Prisma.LoadGetPayload<{ include: typeof loadBoardInclude }>;

function toSerializableLoads(loads: LoadRow[], actor: BoardActor): SerializableLoad[] {
  const visibilityActor = {
    companyId: actor.companyId,
    role: actor.role,
  };
  return loads.map((l) => ({
    id: l.id,
    referenceNumber: l.referenceNumber,
    originCity: l.originCity,
    originState: l.originState,
    originZip: l.originZip,
    destinationCity: l.destinationCity,
    destinationState: l.destinationState,
    destinationZip: l.destinationZip,
    weightLbs: l.weightLbs,
    equipmentType: l.equipmentType,
    isRush: l.isRush,
    status: l.status,
    uniquePickupCode: l.uniquePickupCode,
    shipperCompanyId: l.shipperCompanyId,
    shipperCompanyName: shipperCompanyNameForViewer(l.shipperCompany.legalName, l, visibilityActor),
    offerCurrency: l.offerCurrency,
    offeredRateUsd: l.offeredRateUsd != null ? Number(l.offeredRateUsd) : null,
    requestedPickupAt: l.requestedPickupAt.toISOString(),
    createdAt: l.createdAt.toISOString(),
    booking: l.booking
      ? {
          carrierCompanyId: l.booking.carrierCompanyId,
          agreedRateUsd: Number(l.booking.agreedRateUsd),
          agreedCurrency: l.booking.agreedCurrency,
          carrierCompany: {
            legalName:
              carrierCompanyNameForViewer(l.booking.carrierCompany.legalName, l, visibilityActor) ?? "",
          },
        }
      : null,
    dispatchLink: l.dispatchLink,
  }));
}

export default async function Home() {
  const { userId } = await auth();

  let loads: LoadRow[] = [];
  let stalePostedLoads: { id: string; referenceNumber: string }[] = [];
  let dbError: string | null = null;
  let profileSyncDbError: string | null = null;
  let appUser: { id: string; companyId: string | null; role: string } | null = null;
  let carrierApproved = false;
  let clerkSyncError: "missing_email" | null = null;

  try {
    if (userId) {
      const synced = await syncClerkUserToDatabase();
      clerkSyncError = synced.error;
      appUser = synced.user;
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Database error";
    profileSyncDbError = msg;
    console.error("[home] profile sync error:", e);
  }

  try {
    if (appUser?.role === "DISPATCHER" && appUser.companyId) {
      const co = await prisma.company.findUnique({
        where: { id: appUser.companyId },
        select: { verificationStatus: true },
      });
      carrierApproved = co?.verificationStatus === VerificationStatus.APPROVED;
    }

    const pickupCutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
    loads = await prisma.load.findMany({
      where: {
        OR: [
          { status: { not: LoadStatus.POSTED } },
          { AND: [{ status: LoadStatus.POSTED }, { requestedPickupAt: { gte: pickupCutoff } }] },
        ],
      },
      orderBy: [{ isRush: "desc" }, { createdAt: "desc" }],
      include: loadBoardInclude,
      take: 50,
    });

    if (appUser?.role === "SHIPPER" && appUser.companyId) {
      stalePostedLoads = await prisma.load.findMany({
        where: {
          shipperCompanyId: appUser.companyId,
          status: LoadStatus.POSTED,
          requestedPickupAt: { lt: pickupCutoff },
        },
        select: { id: true, referenceNumber: true },
        orderBy: { requestedPickupAt: "asc" },
        take: 15,
      });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Database error";
    dbError = msg;
    console.error("[home] database error:", e);
  }

  const actor: BoardActor = {
    userId: appUser?.id ?? null,
    companyId: appUser?.companyId ?? null,
    role: appUser?.role ?? null,
    carrierApproved,
  };

  const active = loads.filter((l) => l.status !== LoadStatus.DELIVERED).length;
  const rush = loads.filter((l) => l.isRush).length;
  const delivered = loads.filter((l) => l.status === LoadStatus.DELIVERED).length;

  if (!userId) {
    return (
      <main className="min-h-[calc(100vh-3.5rem)] bg-lob-paper text-stone-900">
        <LandingEntry />
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-lob-paper text-stone-900">
      <div className="px-3 py-3 sm:px-4">
        {dbError && (
          <section className="mb-4 rounded-2xl border border-red-200/80 bg-gradient-to-b from-red-50 to-white p-5 text-red-950 shadow-sm shadow-red-900/5">
            {(() => {
              const g = getDatabaseErrorGuidance(dbError);
              return (
                <>
                  <h2 className="text-lg font-semibold tracking-tight">{g.title}</h2>
                  <ul className="mt-3 list-inside list-disc space-y-2 text-sm leading-relaxed text-red-950/90">
                    {g.body.map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                  <p className="mt-4 text-sm">
                    <Link className="font-semibold text-red-900 underline decoration-red-300 underline-offset-2" href="/api/health">
                      Check /api/health
                    </Link>{" "}
                    (hints only; no secrets exposed).
                  </p>
                  <p className="mt-3 rounded-lg bg-red-100/60 px-3 py-2 font-mono text-[11px] leading-snug text-red-900/80">
                    {dbError}
                  </p>
                </>
              );
            })()}
          </section>
        )}

        {profileSyncDbError && !dbError && (
          <section className="mb-4 rounded-lg border border-red-300 bg-red-50 p-4 text-red-950">
            <h2 className="text-lg font-semibold">Could not sync your account</h2>
            <p className="mt-2 text-sm">
              The database rejected the profile update (often duplicate email rows). Run{" "}
              <code className="rounded bg-red-100 px-1">npm run admin:setup -- your@email.com</code> against production,
              or merge duplicate <code className="rounded bg-red-100 px-1">User</code> rows in Supabase, then refresh.
            </p>
            <p className="mt-2 font-mono text-xs opacity-80">{profileSyncDbError}</p>
          </section>
        )}

        {userId && clerkSyncError === "missing_email" && (
          <section className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-950">
            <h2 className="font-semibold">Account email required</h2>
            <p className="mt-1 text-sm">
              Clerk did not return a primary email, so LOB cannot create your database profile. Add an email in your
              Clerk user and refresh this page.
            </p>
          </section>
        )}

        {userId &&
          appUser?.role === "DISPATCHER" &&
          appUser.companyId &&
          !carrierApproved && (
            <section className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-4">
              <h2 className="font-semibold text-amber-900">Carrier verification pending</h2>
              <p className="mt-1 text-sm text-amber-800">
                An admin must approve your company before you can book loads. If this is your own preview
                environment, set <code className="rounded bg-amber-100 px-1">LOB_AUTO_APPROVE_CARRIERS=true</code> in
                Vercel and register again, or approve yourself in the admin queue.
              </p>
              <Link
                className="mt-2 inline-block text-sm font-medium text-amber-900 underline"
                href="/admin/carriers"
              >
                Open admin · Carriers
              </Link>
            </section>
          )}

        {userId && appUser && !appUser.companyId && appUser.role !== "ADMIN" && (
          <section className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-4">
            <h2 className="font-semibold text-amber-900">One step left — link your company</h2>
            <p className="mt-1 text-sm text-amber-800">
              Your sign-in is connected. Create a <strong>supplier</strong> profile (mill, wholesaler, or other lumber
              supplier) to post loads, or a <strong>carrier</strong> profile to book them (carriers may need admin approval unless preview
              auto-approve is on).
            </p>
            <Link
              className="mt-3 inline-block rounded bg-amber-700 px-4 py-2 text-sm font-medium text-white"
              href="/onboarding"
            >
              Go to account setup
            </Link>
          </section>
        )}

        {userId && appUser?.role === "ADMIN" && (
          <section className="mb-4 rounded-lg border border-stone-200 bg-white p-4 text-sm text-stone-700 shadow-sm">
            <p className="font-medium text-stone-900">Signed in as admin</p>
            <p className="mt-1">
              Use <strong>Carriers</strong> and <strong>Companies</strong> in the top bar. To post loads or capacity as a
              tester, open{" "}
              <Link className="font-medium text-lob-navy underline" href="/admin/test-lab">
                Test lab
              </Link>{" "}
              (enable <code className="rounded bg-stone-100 px-1">LOB_ALLOW_ADMIN_PERSONA_SWITCH</code> and seed the DB)
              or complete{" "}
              <Link className="font-medium text-lob-navy underline" href="/onboarding">
                account setup
              </Link>{" "}
              as a supplier/carrier.
            </p>
          </section>
        )}

        {userId &&
          !appUser &&
          clerkSyncError !== "missing_email" &&
          !profileSyncDbError && (
          <section className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-950">
            <p className="font-semibold">Could not load your profile</p>
            <p className="mt-1">Check the banners above, then refresh.</p>
          </section>
        )}

        {userId && appUser?.role === "SHIPPER" && stalePostedLoads.length > 0 && (
          <section className="mx-auto mb-4 max-w-[1600px] rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
            <p className="font-semibold">Loads past the pickup window</p>
            <p className="mt-1 text-amber-900">
              These are no longer on the public board (48 hours after the requested pickup date). Update the pickup date
              and repost, or cancel in your TMS.
            </p>
            <ul className="mt-2 list-inside list-disc">
              {stalePostedLoads.map((l) => (
                <li key={l.id}>
                  <Link className="font-medium underline" href={`/loads/${l.id}`}>
                    {l.referenceNumber}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <LoadBoardWorkspace
          loads={dbError ? [] : toSerializableLoads(loads, actor)}
          actor={actor}
          stats={{ active, rush, delivered }}
        />

        <details className="mx-auto mt-6 max-w-[1600px] rounded border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600">
          <summary className="cursor-pointer font-medium text-zinc-900">Deploy, admin, and API (for builders)</summary>
          <ol className="mt-3 list-inside list-decimal space-y-2 text-zinc-700">
            <li>
              Set <code className="rounded bg-zinc-100 px-1">DATABASE_URL</code> to your Supabase{" "}
              <strong>session pooler</strong> URL (see <Link href="/api/health">/api/health</Link>).
            </li>
            <li>
              Run migrations: <code className="rounded bg-zinc-100 px-1">npx prisma migrate deploy</code> in the Vercel
              build or a one-off job; then <code className="rounded bg-zinc-100 px-1">npm run db:seed</code> (or seed via
              SQL) so loads exist.
            </li>
            <li>
              Add Clerk keys and (optional) <code className="rounded bg-zinc-100 px-1">CLERK_WEBHOOK_SIGNING_SECRET</code>{" "}
              — signing in now <strong>auto-creates</strong> your DB user even if the webhook is not wired yet.
            </li>
            <li>
              Admin role: set <code className="rounded bg-zinc-100 px-1">LOB_AUTO_ADMIN_EMAILS</code> (comma-separated) or{" "}
              <code className="rounded bg-zinc-100 px-1">LOB_AUTO_ADMIN_EMAIL</code> (preview only), or run{" "}
              <code className="rounded bg-zinc-100 px-1">npm run set-admin -- a@x.com b@y.com</code> against the same database.
            </li>
            <li>
              To test booking without admin: set{" "}
              <code className="rounded bg-zinc-100 px-1">LOB_AUTO_APPROVE_CARRIERS=true</code> on the preview project
              (remove for real launches).
            </li>
            <li>
              API: <code>POST /api/loads</code>, <code>POST /api/loads/:id/book</code>,{" "}
              <code>POST /api/loads/:id/dispatch</code>. More in <Link href="/insights">Insights</Link>.
            </li>
          </ol>
        </details>
      </div>
    </main>
  );
}
