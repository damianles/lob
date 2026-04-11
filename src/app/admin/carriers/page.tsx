import { VerificationStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { CarrierReviewActions } from "./review-actions";

export const dynamic = "force-dynamic";

function statusClass(status: VerificationStatus) {
  if (status === VerificationStatus.PENDING) return "bg-amber-100 text-amber-900";
  if (status === VerificationStatus.APPROVED) return "bg-emerald-100 text-emerald-900";
  return "bg-rose-100 text-rose-900";
}

export default async function AdminCarriersPage() {
  const carriers = await prisma.company.findMany({
    where: { carrierType: { not: null } },
    include: {
      users: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: [{ verificationStatus: "asc" }, { createdAt: "desc" }],
  });

  return (
    <main className="min-h-screen bg-zinc-50 p-6 text-zinc-900">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-bold">Carrier Verification Queue</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Use this page as admin workflow for approving or rejecting carrier applications.
        </p>

        <div className="mt-6 overflow-x-auto rounded-lg border bg-white">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="p-3">Company</th>
                <th className="p-3">Type</th>
                <th className="p-3">DOT/MC</th>
                <th className="p-3">Primary user</th>
                <th className="p-3">Status</th>
                <th className="p-3">Analytics</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {carriers.map((carrier) => (
                <tr key={carrier.id} className="border-b">
                  <td className="p-3 font-medium">{carrier.legalName}</td>
                  <td className="p-3">{carrier.carrierType}</td>
                  <td className="p-3">
                    {carrier.dotNumber ?? "-"} / {carrier.mcNumber ?? "-"}
                  </td>
                  <td className="p-3">
                    {carrier.users[0]?.name ?? "N/A"} ({carrier.users[0]?.email ?? "N/A"})
                  </td>
                  <td className="p-3">
                    <span className={`rounded px-2 py-1 text-xs ${statusClass(carrier.verificationStatus)}`}>
                      {carrier.verificationStatus}
                    </span>
                  </td>
                  <td className="p-3">
                    {carrier.analyticsSubscriber ? (
                      <span className="rounded bg-emerald-100 px-2 py-1 text-xs text-emerald-900">Enabled</span>
                    ) : (
                      <span className="rounded bg-zinc-100 px-2 py-1 text-xs text-zinc-700">Disabled</span>
                    )}
                  </td>
                  <td className="p-3">
                    <CarrierReviewActions companyId={carrier.id} analyticsEnabled={carrier.analyticsSubscriber} />
                  </td>
                </tr>
              ))}
              {carriers.length === 0 && (
                <tr>
                  <td className="p-4 text-center text-zinc-500" colSpan={7}>
                    No carrier applications yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

