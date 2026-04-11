import { auth } from "@clerk/nextjs/server";
import { LoadStatus, VerificationStatus, type Prisma } from "@prisma/client";
import Link from "next/link";

import { LoadBoardWorkspace, type BoardActor, type SerializableLoad } from "@/components/load-board-workspace";
import { prisma } from "@/lib/prisma";
import { shipperCompanyNameForViewer } from "@/lib/shipper-visibility";
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
    offeredRateUsd: l.offeredRateUsd != null ? Number(l.offeredRateUsd) : null,
    createdAt: l.createdAt.toISOString(),
    booking: l.booking
      ? {
          carrierCompanyId: l.booking.carrierCompanyId,
          agreedRateUsd: Number(l.booking.agreedRateUsd),
          carrierCompany: { legalName: l.booking.carrierCompany.legalName },
        }
      : null,
    dispatchLink: l.dispatchLink,
  }));
}

export default async function Home() {
  const { userId } = await auth();

  let loads: LoadRow[] = [];
  let dbError: string | null = null;
  let appUser: { id: string; companyId: string | null; role: string } | null = null;
  let carrierApproved = false;
  let clerkSyncError: "missing_email" | null = null;

  try {
    if (userId) {
      const synced = await syncClerkUserToDatabase();
      clerkSyncError = synced.error;
      appUser = synced.user;
    }

    if (appUser?.role === "DISPATCHER" && appUser.companyId) {
      const co = await prisma.company.findUnique({
        where: { id: appUser.companyId },
        select: { verificationStatus: true },
      });
      carrierApproved = co?.verificationStatus === VerificationStatus.APPROVED;
    }

    loads = await prisma.load.findMany({
      orderBy: [{ isRush: "desc" }, { createdAt: "desc" }],
      include: loadBoardInclude,
      take: 50,
    });
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

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-zinc-100 text-zinc-900">
      <div className="px-3 py-3 sm:px-4">
        {dbError && (
          <section className="mb-4 rounded-lg border border-red-300 bg-red-50 p-4 text-red-950">
            <h2 className="text-lg font-semibold">Database connection failed</h2>
            <p className="mt-2 text-sm">
              On Vercel, set <code className="rounded bg-red-100 px-1">DATABASE_URL</code> to the Supabase{" "}
              <strong>session pooler</strong> URL, then redeploy.{" "}
              <Link className="font-medium underline" href="/api/health">
                /api/health
              </Link>
            </p>
            <p className="mt-2 font-mono text-xs opacity-80">{dbError}</p>
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

        {userId && appUser && !appUser.companyId && (
          <section className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-4">
            <h2 className="font-semibold text-amber-900">One step left — link your company</h2>
            <p className="mt-1 text-sm text-amber-800">
              Your sign-in is connected. Create a <strong>mill / wholesaler</strong> profile to post loads, or a{" "}
              <strong>trucking company</strong> profile to book them (carriers may need admin approval unless preview
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

        {userId && !appUser && clerkSyncError !== "missing_email" && (
          <section className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-950">
            <p className="font-semibold">Could not load your profile</p>
            <p className="mt-1">Check the database connection banner above, then refresh.</p>
          </section>
        )}

        <LoadBoardWorkspace
          loads={dbError ? [] : toSerializableLoads(loads, actor)}
          actor={actor}
          stats={{ active, rush, delivered }}
        />

        <details className="mx-auto mt-6 max-w-[1600px] rounded border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600">
          <summary className="cursor-pointer font-medium text-zinc-900">Make Vercel / production work</summary>
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
              To test booking without admin: set{" "}
              <code className="rounded bg-zinc-100 px-1">LOB_AUTO_APPROVE_CARRIERS=true</code> on the preview project
              (remove for real launches).
            </li>
            <li>
              Explore: mill account → post load → second Clerk user as carrier (or incognito) → book → driver link →{" "}
              <Link className="underline" href="/tools">
                Tools
              </Link>
              .
            </li>
          </ol>
        </details>

        <details className="mx-auto mt-3 max-w-[1600px] rounded border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600">
          <summary className="cursor-pointer font-medium text-zinc-900">API reference (integrations)</summary>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>
              <code>POST /api/loads</code> · <code>POST /api/loads/:id/book</code> ·{" "}
              <code>POST /api/loads/:id/dispatch</code>
            </li>
          </ul>
        </details>
      </div>
    </main>
  );
}
