import { SupplierKind, VerificationStatus } from "@prisma/client";

import { LobBrandStrip } from "@/components/lob-brand-strip";
import { CarrierReviewActions } from "@/app/admin/carriers/review-actions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function statusClass(status: VerificationStatus) {
  if (status === VerificationStatus.PENDING) return "bg-amber-100 text-amber-900";
  if (status === VerificationStatus.APPROVED) return "bg-emerald-100 text-emerald-900";
  return "bg-rose-100 text-rose-900";
}

function supplierLabel(k: SupplierKind) {
  if (k === "MILL") return "Mill";
  if (k === "WHOLESALER") return "Wholesaler";
  return "Supplier";
}

export default async function AdminSuppliersPage() {
  const suppliers = await prisma.company.findMany({
    where: { supplierKind: { not: null }, carrierType: null },
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
        <LobBrandStrip />
        <h1 className="mt-4 text-3xl font-bold">Supplier verification queue</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Mills, wholesalers, and other lumber suppliers must be approved before they can post loads. Account type is
          stored on the company for analytics — the in-app product is a single &quot;Supplier&quot; experience.
        </p>

        <div className="mt-6 overflow-x-auto rounded-lg border bg-white">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="p-3">Company</th>
                <th className="p-3">Type on file</th>
                <th className="p-3">Primary user</th>
                <th className="p-3">Status</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((c) => (
                <tr key={c.id} className="border-b">
                  <td className="p-3 font-medium">{c.legalName}</td>
                  <td className="p-3 text-zinc-700">
                    {c.supplierKind ? supplierLabel(c.supplierKind) : "—"}
                  </td>
                  <td className="p-3">
                    {c.users[0]?.name ?? "N/A"} ({c.users[0]?.email ?? "N/A"})
                  </td>
                  <td className="p-3">
                    <span className={`rounded px-2 py-1 text-xs ${statusClass(c.verificationStatus)}`}>
                      {c.verificationStatus}
                    </span>
                  </td>
                  <td className="p-3">
                    <CarrierReviewActions companyId={c.id} analyticsEnabled={c.analyticsSubscriber} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {suppliers.length === 0 && (
          <p className="mt-4 text-sm text-zinc-500">No supplier companies in the database yet.</p>
        )}
      </div>
    </main>
  );
}
