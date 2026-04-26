import { notFound } from "next/navigation";
import { Suspense } from "react";

import { prisma } from "@/lib/prisma";

import { FacilityPickupForm } from "./facility-pickup-form";

export const dynamic = "force-dynamic";

export default async function FacilityPickupPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const dispatch = await prisma.dispatchLink.findUnique({
    where: { token },
    include: { load: { select: { referenceNumber: true } } },
  });
  if (!dispatch) notFound();

  return (
    <main className="mx-auto min-h-[calc(100vh-3.5rem)] max-w-lg overflow-x-hidden bg-stone-50 px-3 py-8 sm:px-4 sm:py-10">
      <h1 className="text-xl font-bold tracking-tight text-zinc-900">LOB · Pickup confirmation</h1>
      <p className="mt-2 text-sm text-zinc-600 leading-relaxed break-words">
        You do not need a LOB account. This page is only for confirming that freight has been picked up at the origin.
      </p>
      <Suspense
        fallback={
          <div className="mt-6 h-32 animate-pulse rounded-2xl border border-stone-200 bg-stone-100" aria-hidden />
        }
      >
        <FacilityPickupForm token={dispatch.token} referenceNumber={dispatch.load.referenceNumber} />
      </Suspense>
    </main>
  );
}
