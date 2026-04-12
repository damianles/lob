import Link from "next/link";
import { LoadStatus } from "@prisma/client";

import { LobBrandStrip } from "@/components/lob-brand-strip";
import { LobSidebar } from "@/components/lob-sidebar";
import { formatMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { getActorContext } from "@/lib/request-context";

export const dynamic = "force-dynamic";

const TRACKED: LoadStatus[] = [
  LoadStatus.BOOKED,
  LoadStatus.ASSIGNED,
  LoadStatus.IN_TRANSIT,
  LoadStatus.DELIVERED,
];

function stepLabel(status: LoadStatus, pickupAt: string | null, deliveredAt: string | null) {
  if (status === LoadStatus.DELIVERED || deliveredAt) return "Delivered";
  if (status === LoadStatus.IN_TRANSIT || pickupAt) return "In transit";
  if (status === LoadStatus.ASSIGNED) return "Driver assigned";
  if (status === LoadStatus.BOOKED) return "Booked";
  return status;
}

export default async function BookedFreightPage() {
  const actor = await getActorContext();
  if (!actor.userId) {
    return (
      <main className="mx-auto max-w-lg p-8">
        <h1 className="text-xl font-bold">Booked freight</h1>
        <p className="mt-2 text-sm text-zinc-600">Sign in to see your confirmed loads.</p>
        <Link href="/sign-in" className="mt-4 inline-block text-lob-navy underline">
          Sign in
        </Link>
      </main>
    );
  }

  let where:
    | { status: { in: LoadStatus[] }; booking: { isNot: null } }
    | { status: { in: LoadStatus[] }; shipperCompanyId: string; booking: { isNot: null } }
    | { status: { in: LoadStatus[] }; booking: { is: { carrierCompanyId: string } } }
    | null = null;

  if (actor.role === "ADMIN") {
    where = { status: { in: TRACKED }, booking: { isNot: null } };
  } else if (actor.role === "SHIPPER" && actor.companyId) {
    where = {
      status: { in: TRACKED },
      shipperCompanyId: actor.companyId,
      booking: { isNot: null },
    };
  } else if (actor.role === "DISPATCHER" && actor.companyId) {
    where = {
      status: { in: TRACKED },
      booking: { is: { carrierCompanyId: actor.companyId } },
    };
  }

  if (!where) {
    return (
      <main className="min-h-[calc(100vh-3.5rem)] bg-lob-paper text-stone-900">
        <div className="mx-auto flex max-w-[1600px] gap-0 rounded-lg border border-zinc-200 bg-white shadow-sm">
          <LobSidebar active="booked" />
          <div className="min-w-0 flex-1 p-8">
            <LobBrandStrip />
            <h1 className="mt-4 text-2xl font-bold">Booked freight</h1>
            <p className="mt-2 text-sm text-zinc-600">
              Complete onboarding as a mill/wholesaler or carrier to see bookings tied to your company.
            </p>
            <Link href="/onboarding" className="mt-4 inline-block font-medium text-lob-navy underline">
              Account setup
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const loads = await prisma.load.findMany({
    where,
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    take: 80,
    include: {
      booking: { include: { carrierCompany: { select: { legalName: true } } } },
      dispatchLink: true,
      shipperCompany: { select: { legalName: true } },
    },
  });

  const [active, rush, delivered] = await Promise.all([
    prisma.load.count({ where: { status: { not: LoadStatus.DELIVERED } } }),
    prisma.load.count({ where: { isRush: true } }),
    prisma.load.count({ where: { status: LoadStatus.DELIVERED } }),
  ]);

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-lob-paper text-stone-900">
      <div className="mx-auto flex max-w-[1600px] gap-0 rounded-lg border border-zinc-200 bg-white shadow-sm">
        <LobSidebar active="booked" stats={{ active, rush, delivered }} />
        <div className="min-w-0 flex-1">
          <LobBrandStrip />
          <div className="p-6 lg:p-8">
            <h1 className="text-2xl font-bold text-zinc-900">Booked freight</h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-600">
              Confirmed moves for your business. Pickup and delivery can be confirmed when facilities scan the driver’s
              QR code—no LOB account required at the dock. Drivers use the dispatch link from your carrier team.
            </p>

            <div className="mt-6 overflow-x-auto rounded-lg border border-zinc-200 bg-white">
              <table className="w-full min-w-[880px] text-left text-sm">
                <thead className="border-b bg-zinc-50 text-xs font-semibold uppercase text-zinc-600">
                  <tr>
                    <th className="px-3 py-2">Reference</th>
                    <th className="px-3 py-2">Lane</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2 text-right">Rate</th>
                    <th className="px-3 py-2">Counterparty</th>
                    <th className="px-3 py-2">Dispatch</th>
                  </tr>
                </thead>
                <tbody>
                  {loads.map((l) => {
                    const pickupAt = l.dispatchLink?.pickupConfirmedAt?.toISOString() ?? null;
                    const deliveredAt = l.dispatchLink?.deliveredAt?.toISOString() ?? null;
                    const isShipperView =
                      actor.role === "SHIPPER" && actor.companyId === l.shipperCompanyId;
                    const isCarrierView =
                      Boolean(l.booking) &&
                      actor.role === "DISPATCHER" &&
                      actor.companyId === l.booking?.carrierCompanyId;

                    let counterparty: string;
                    if (actor.role === "ADMIN") {
                      counterparty = `${l.shipperCompany.legalName} · ${l.booking?.carrierCompany.legalName ?? "?"}`;
                    } else if (isShipperView) {
                      counterparty = l.booking?.carrierCompany.legalName ?? "—";
                    } else if (isCarrierView) {
                      counterparty = l.shipperCompany.legalName;
                    } else {
                      counterparty = "—";
                    }
                    return (
                      <tr key={l.id} className="border-b border-zinc-100">
                        <td className="px-3 py-2 font-medium">
                          <Link href={`/loads/${l.id}`} className="text-lob-navy underline">
                            {l.referenceNumber}
                          </Link>
                        </td>
                        <td className="px-3 py-2 text-zinc-700">
                          {l.originCity}, {l.originState} → {l.destinationCity}, {l.destinationState}
                        </td>
                        <td className="px-3 py-2 text-xs font-medium text-zinc-800">
                          {stepLabel(l.status, pickupAt, deliveredAt)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {l.booking
                            ? formatMoney(Number(l.booking.agreedRateUsd), l.booking.agreedCurrency)
                            : "—"}
                        </td>
                        <td className="max-w-[200px] truncate px-3 py-2 text-zinc-600">{counterparty ?? "—"}</td>
                        <td className="px-3 py-2">
                          {l.dispatchLink ? (
                            <Link
                              className="text-lob-navy underline"
                              href={`/loads/${l.id}`}
                              title="Open load for QR & driver link"
                            >
                              View / QR
                            </Link>
                          ) : (
                            <span className="text-zinc-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {loads.length === 0 && (
                <p className="p-8 text-center text-sm text-zinc-500">No booked loads in this view yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
