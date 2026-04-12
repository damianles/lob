import Link from "next/link";

import { LobBrandStrip } from "@/components/lob-brand-strip";
import { isAdminPersonaSwitchEnabled } from "@/lib/admin-test-personas";
import { prisma } from "@/lib/prisma";

import { PersonaActions } from "./persona-actions";

export const dynamic = "force-dynamic";

export default async function AdminTestLabPage() {
  const personaSwitchEnabled = isAdminPersonaSwitchEnabled();

  const [shipperCo, carrierCo] = await Promise.all([
    prisma.company.findUnique({
      where: { legalName: "North Ridge Lumber" },
      select: { id: true, legalName: true },
    }),
    prisma.company.findUnique({
      where: { legalName: "Blue Ox Transport" },
      select: { id: true, legalName: true },
    }),
  ]);

  return (
    <main className="min-h-screen bg-zinc-50 p-6 text-zinc-900">
      <div className="mx-auto max-w-3xl">
        <LobBrandStrip />
        <h1 className="mt-4 text-3xl font-bold">Admin test lab</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Switch your signed-in Clerk user between <strong>admin</strong>, seeded <strong>supplier</strong>, and seeded{" "}
          <strong>carrier</strong> roles so you can test posting loads, capacity, booking, and profiles without separate
          accounts.
        </p>

        <section className="mt-8 rounded-lg border bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Persona switcher</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Requires <code className="rounded bg-zinc-100 px-1">LOB_ALLOW_ADMIN_PERSONA_SWITCH=true</code> and seed data.
          </p>
          <div className="mt-4">
            <PersonaActions personaSwitchEnabled={personaSwitchEnabled} />
          </div>
        </section>

        <section className="mt-6 rounded-lg border border-zinc-200 bg-zinc-100/80 p-4 text-sm text-zinc-700">
          <h3 className="font-semibold text-zinc-900">Seed companies</h3>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>
              Supplier: North Ridge Lumber —{" "}
              {shipperCo ? (
                <span className="text-emerald-800">present</span>
              ) : (
                <span className="text-red-800">missing — run npm run db:seed</span>
              )}
            </li>
            <li>
              Carrier: Blue Ox Transport —{" "}
              {carrierCo ? (
                <span className="text-emerald-800">present</span>
              ) : (
                <span className="text-red-800">missing — run npm run db:seed</span>
              )}
            </li>
          </ul>
        </section>

        <section className="mt-6 text-sm text-zinc-600">
          <p>
            <Link className="font-medium text-lob-navy underline" href="/">
              Loads
            </Link>
            {" · "}
            <Link className="font-medium text-lob-navy underline" href="/capacity">
              Capacity
            </Link>
            {" · "}
            <Link className="font-medium text-lob-navy underline" href="/onboarding">
              Account setup
            </Link>
            {" · "}
            <Link className="font-medium text-lob-navy underline" href="/admin/carriers">
              Admin carriers
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
