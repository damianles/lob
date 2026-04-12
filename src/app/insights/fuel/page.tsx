import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { getActorContext } from "@/lib/request-context";

import { FuelLaneForm } from "./fuel-lane-form";

export const dynamic = "force-dynamic";

export default async function FuelInsightsPage() {
  const actor = await getActorContext();
  if (!actor.userId) {
    return (
      <div className="max-w-3xl">
        <h1 className="text-2xl font-bold">Fuel pricing</h1>
        <p className="mt-2 text-sm text-zinc-600">Please sign in to access insights.</p>
      </div>
    );
  }

  let isSubscriber = actor.role === "ADMIN";
  if (!isSubscriber && actor.companyId) {
    const company = await prisma.company.findUnique({
      where: { id: actor.companyId },
      select: { analyticsSubscriber: true },
    });
    isSubscriber = Boolean(company?.analyticsSubscriber);
  }

  if (!isSubscriber) {
    return (
      <div className="max-w-3xl">
        <h1 className="text-2xl font-bold">Fuel pricing (subscriber)</h1>
        <p className="mt-2 text-sm text-zinc-600">
          This tool is available for paid subscribers. Ask an admin to enable analytics for your company.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl text-zinc-900">
      <h1 className="text-2xl font-bold sm:text-3xl">Fuel pricing</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Enter origin and destination ZIP codes. LOB estimates retail diesel at each end from state-level reference data,
        then shows a simple blend for trip planning. Swap the data file or wire an API (EIA, rack, etc.) when you are
        ready for live pumps.
      </p>
      <FuelLaneForm />
      <p className="mt-8 text-xs text-zinc-500">
        Prefer lane benchmarks? Use{" "}
        <Link href="/insights/lanes" className="font-medium text-lob-navy underline">
          Lane rate analytics
        </Link>
        .
      </p>
    </div>
  );
}
