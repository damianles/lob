import { notFound } from "next/navigation";

import { equipmentShortTag } from "@/lib/lumber-equipment";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function DriverPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const dispatch = await prisma.dispatchLink.findUnique({
    where: { token },
    include: {
      load: true,
      podDocument: true,
    },
  });

  if (!dispatch) {
    notFound();
  }

  const expired = dispatch.expiresAt < new Date();

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-bold">Driver haul sheet</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Haul details only — no rates. Pickup and delivery are confirmed by the yard or receiver, not on this page.
      </p>

      <section className="mt-6 rounded-lg border p-4">
        <h2 className="font-semibold">Driver</h2>
        <p className="mt-2 text-sm">{dispatch.driverName}</p>
        {dispatch.driverPhone ? <p className="text-sm text-zinc-600">{dispatch.driverPhone}</p> : null}
      </section>

      <section className="mt-6 rounded-lg border p-4">
        <h2 className="font-semibold">Load {dispatch.load.referenceNumber}</h2>
        <p className="mt-2 text-sm">
          {dispatch.load.originCity}, {dispatch.load.originState} {dispatch.load.originZip} to{" "}
          {dispatch.load.destinationCity}, {dispatch.load.destinationState}{" "}
          {dispatch.load.destinationZip}
        </p>
        <p className="mt-1 text-sm">Weight: {dispatch.load.weightLbs.toLocaleString()} lbs</p>
        <p className="mt-1 text-sm">Equipment: {equipmentShortTag(dispatch.load.equipmentType)}</p>
      </section>

      <section className="mt-6 rounded-lg border p-4">
        <h2 className="font-semibold">Status</h2>
        <p className="mt-2 text-sm">Dispatch status: {dispatch.status}</p>
        <p className="text-sm">Pickup confirmed: {dispatch.pickupConfirmedAt ? "Yes" : "No"}</p>
        <p className="text-sm">Delivered: {dispatch.deliveredAt ? "Yes" : "No"}</p>
        <p className="text-sm">Link expired: {expired ? "Yes" : "No"}</p>
      </section>
    </main>
  );
}
