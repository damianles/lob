import { prisma } from "@/lib/prisma";

import { AnalyticsToggle } from "./analytics-toggle";

export const dynamic = "force-dynamic";

export default async function AdminCompaniesPage() {
  const companies = await prisma.company.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      users: {
        select: {
          name: true,
          email: true,
        },
        take: 1,
      },
    },
  });

  return (
    <main className="min-h-screen bg-zinc-50 p-6 text-zinc-900">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-bold">Company Subscriptions</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Enable or disable analytics subscription access for shippers and carriers.
        </p>

        <div className="mt-6 overflow-x-auto rounded-lg border bg-white">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="p-3">Company</th>
                <th className="p-3">Type</th>
                <th className="p-3">Verification</th>
                <th className="p-3">Primary contact</th>
                <th className="p-3">Analytics</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((company) => (
                <tr key={company.id} className="border-b">
                  <td className="p-3 font-medium">{company.legalName}</td>
                  <td className="p-3">{company.carrierType ?? "SHIPPER"}</td>
                  <td className="p-3">{company.verificationStatus}</td>
                  <td className="p-3">
                    {company.users[0]?.name ?? "N/A"} ({company.users[0]?.email ?? "N/A"})
                  </td>
                  <td className="p-3">
                    {company.analyticsSubscriber ? (
                      <span className="rounded bg-emerald-100 px-2 py-1 text-xs text-emerald-900">Enabled</span>
                    ) : (
                      <span className="rounded bg-zinc-100 px-2 py-1 text-xs text-zinc-700">Disabled</span>
                    )}
                  </td>
                  <td className="p-3">
                    <AnalyticsToggle companyId={company.id} enabled={company.analyticsSubscriber} />
                  </td>
                </tr>
              ))}
              {companies.length === 0 && (
                <tr>
                  <td className="p-4 text-center text-zinc-500" colSpan={6}>
                    No companies found.
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

