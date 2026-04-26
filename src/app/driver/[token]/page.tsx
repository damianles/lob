import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { DispatchQrPanel } from "@/components/dispatch-qr-panel";
import { prisma } from "@/lib/prisma";
import { DriverActions } from "./driver-actions";

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

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const baseUrl = `${proto}://${host}`;

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-bold">Driver Dispatch</h1>
      <p className="mt-2 text-sm text-zinc-600">No-rate version for driver use.</p>

      <section className="mt-6 rounded-lg border p-4">
        <h2 className="font-semibold">Load {dispatch.load.referenceNumber}</h2>
        <p className="mt-2 text-sm">
          {dispatch.load.originCity}, {dispatch.load.originState} {dispatch.load.originZip} to{" "}
          {dispatch.load.destinationCity}, {dispatch.load.destinationState}{" "}
          {dispatch.load.destinationZip}
        </p>
        <p className="mt-1 text-sm">Weight: {dispatch.load.weightLbs.toLocaleString()} lbs</p>
        <p className="mt-1 text-sm">Equipment: {dispatch.load.equipmentType}</p>
      </section>

      <section className="mt-6 rounded-lg border p-4">
        <h2 className="font-semibold">Status</h2>
        <p className="mt-2 text-sm">Dispatch status: {dispatch.status}</p>
        <p className="text-sm">Pickup confirmed: {dispatch.pickupConfirmedAt ? "Yes" : "No"}</p>
        <p className="text-sm">POD uploaded: {dispatch.podDocument ? "Yes" : "No"}</p>
        <p className="text-sm">Link expired: {expired ? "Yes" : "No"}</p>
      </section>

      <DispatchQrPanel
        pickupUrl={`${baseUrl}/facility/pickup/${dispatch.token}`}
        deliveryUrl={`${baseUrl}/facility/delivery/${dispatch.token}`}
        driverUrl={`${baseUrl}/driver/${dispatch.token}`}
        pickupCode={dispatch.load.uniquePickupCode}
      />

      <DriverActions
        token={dispatch.token}
        canConfirmPickup={!expired && !dispatch.pickupConfirmedAt}
        canUploadPod={!expired && !dispatch.podDocument && !dispatch.deliveredAt}
      />
    </main>
  );
}

