import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";

import { FacilityDeliveryForm } from "./facility-delivery-form";

export const dynamic = "force-dynamic";

export default async function FacilityDeliveryPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const dispatch = await prisma.dispatchLink.findUnique({
    where: { token },
    include: { load: { select: { referenceNumber: true } } },
  });
  if (!dispatch) notFound();

  return (
    <main className="mx-auto min-h-[calc(100vh-3.5rem)] max-w-lg bg-zinc-50 px-4 py-10">
      <h1 className="text-xl font-bold text-zinc-900">LOB · Delivery confirmation</h1>
      <p className="mt-2 text-sm text-zinc-600">
        You do not need a LOB account. Use this page at the delivery site after scanning the driver’s QR code.
      </p>
      <FacilityDeliveryForm token={dispatch.token} referenceNumber={dispatch.load.referenceNumber} />
    </main>
  );
}
