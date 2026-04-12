import { notFound } from "next/navigation";

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
    <main className="mx-auto min-h-[calc(100vh-3.5rem)] max-w-lg bg-zinc-50 px-4 py-10">
      <h1 className="text-xl font-bold text-zinc-900">LOB · Pickup confirmation</h1>
      <p className="mt-2 text-sm text-zinc-600">
        You do not need a LOB account. This page is only for confirming that freight has been picked up at the origin.
      </p>
      <FacilityPickupForm token={dispatch.token} referenceNumber={dispatch.load.referenceNumber} />
    </main>
  );
}
