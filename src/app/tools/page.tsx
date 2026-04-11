import Link from "next/link";

import { LobSidebar } from "@/components/lob-sidebar";

export const dynamic = "force-dynamic";

export default function ToolsPage() {
  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-lob-paper text-stone-900">
      <div className="mx-auto flex max-w-[1600px] gap-0 rounded-lg border border-zinc-200 bg-white shadow-sm">
        <LobSidebar active="tools" />
        <div className="min-w-0 flex-1 p-6 lg:p-8">
          <h1 className="text-2xl font-bold text-zinc-900">Help & tools</h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-600">
            Lane rates, paperwork, and how to deploy—everything stays inside LOB.
          </p>

          <section className="mt-8 rounded-lg border border-zinc-200 bg-white p-4">
            <h2 className="text-xs font-bold uppercase tracking-wide text-zinc-500">Share with a partner · redeploy</h2>
            <p className="mt-2 text-sm text-zinc-700">
              <strong>Vercel</strong> hosts the website — that is where you <strong>redeploy</strong> after code or env
              changes. <strong>Supabase</strong> is only the database. <strong>Clerk</strong> is only sign-in.
            </p>
            <p className="mt-2 text-sm text-zinc-600">
              Stuck on an <strong>old</strong> site? See <code className="rounded bg-zinc-100 px-1">PUSH_AND_VERCEL.md</code>{" "}
              in the repo (push to GitHub + empty Root Directory). Env vars and seeding:{" "}
              <code className="rounded bg-zinc-100 px-1">DEPLOY.md</code>. Optional demo banner:{" "}
              <code className="rounded bg-zinc-100 px-1">NEXT_PUBLIC_LOB_DEMO_MODE=true</code>.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-xs font-bold uppercase tracking-wide text-zinc-500">Quick tools</h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-lg border border-zinc-200 bg-zinc-50/80 p-4">
                <h3 className="font-semibold text-zinc-900">Lane rate check</h3>
                <p className="mt-2 text-sm text-zinc-600">
                  Compare lanes and time periods using your subscribed benchmarks.
                </p>
                <Link
                  href="/analytics"
                  className="mt-4 inline-block text-sm font-semibold text-lob-navy hover:underline"
                >
                  Open lane rates →
                </Link>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50/80 p-4">
                <h3 className="font-semibold text-zinc-900">Search truck capacity</h3>
                <p className="mt-2 text-sm text-zinc-600">
                  Anonymous lane posts from carriers (full match & fees coming next).
                </p>
                <Link
                  href="/capacity"
                  className="mt-4 inline-block text-sm font-semibold text-lob-navy hover:underline"
                >
                  Capacity board →
                </Link>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-white p-4">
                <h3 className="font-semibold text-zinc-900">Find a load</h3>
                <p className="mt-2 text-sm text-zinc-600">
                  Back to the board: origin, destination, equipment, and weight filters.
                </p>
                <Link href="/" className="mt-4 inline-block text-sm font-semibold text-lob-navy hover:underline">
                  Open load board →
                </Link>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-white p-4">
                <h3 className="font-semibold text-zinc-900">Insurance & certificates</h3>
                <p className="mt-2 text-sm text-zinc-600">
                  Carriers: keep COI and expiry on file for faster booking.
                </p>
                <Link
                  href="/carrier/compliance"
                  className="mt-4 inline-block text-sm font-semibold text-lob-navy hover:underline"
                >
                  Truck paperwork →
                </Link>
              </div>
            </div>
          </section>

          <section className="mt-10">
            <h2 className="text-xs font-bold uppercase tracking-wide text-zinc-500">Help & trust</h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-zinc-200 bg-white p-4">
                <h3 className="font-semibold text-zinc-900">How posting works</h3>
                <p className="mt-2 text-sm text-zinc-600">
                  Mills and wholesalers post loads without showing their name on the open board. After a carrier books,
                  both sides see who they are working with.
                </p>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-white p-4">
                <h3 className="font-semibold text-zinc-900">Report a problem</h3>
                <p className="mt-2 text-sm text-zinc-600">
                  Email your LOB administrator or reply on your onboarding thread. We keep this human, not a ticket maze.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
