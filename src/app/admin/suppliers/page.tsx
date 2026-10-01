import { SupplierKind, VerificationStatus } from "@prisma/client";

import { LobBrandStrip } from "@/components/lob-brand-strip";
import { CarrierReviewActions } from "@/app/admin/carriers/review-actions";
import { CREDIT_FILE_LABELS, type CreditFileKind } from "@/lib/credit-file";
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

function isCreditKind(kind: string): kind is CreditFileKind {
  return kind === "W9" || kind === "CREDIT_REFERENCE" || kind === "INSURANCE" || kind === "BUSINESS_REGISTRATION";
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
      documents: {
        where: {
          dispatchLinkId: null,
          kind: { in: ["W9", "CREDIT_REFERENCE", "INSURANCE", "BUSINESS_REGISTRATION"] },
        },
        orderBy: { createdAt: "desc" },
        select: { id: true, kind: true, fileUrl: true, expiresAt: true },
      },
    },
    orderBy: [{ verificationStatus: "asc" }, { createdAt: "desc" }],
  });

  return (
    <main className="min-h-screen bg-zinc-50 p-6 text-zinc-900">
      <div className="mx-auto max-w-5xl">
        <LobBrandStrip />
        <h1 className="mt-4 text-3xl font-bold">Supplier Verification Queue</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Mills, wholesalers, and other lumber suppliers must be approved before they can post loads. Before Approve:
          open each credit link, confirm the legal name matches the documents, then Mark docs verified.
        </p>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-xs text-zinc-600">
          <li>Open the W-9 / business registration and credit reference files.</li>
          <li>Confirm company legal name on the docs matches the registration.</li>
          <li>Call or note the business phone (and remittance email if filed) if anything looks off.</li>
          <li>Mark docs verified, then Approve (or Reject).</li>
        </ol>

        <div className="mt-6 overflow-x-auto rounded-lg border bg-white">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="p-3">Company</th>
                <th className="p-3">Type / contact</th>
                <th className="p-3">Credit file</th>
                <th className="p-3">Docs</th>
                <th className="p-3">Status</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((c) => {
                const seen = new Set<string>();
                const docs = c.documents.filter((d) => {
                  if (!isCreditKind(d.kind) || seen.has(d.kind)) return false;
                  seen.add(d.kind);
                  return true;
                });
                const docsVerified = Boolean(c.creditDocsVerifiedAt);
                return (
                  <tr key={c.id} className="border-b align-top">
                    <td className="p-3">
                      <p className="font-medium">{c.legalName}</p>
                      {c.acronym ? (
                        <p className="text-xs text-zinc-500">Acronym {c.acronym}</p>
                      ) : null}
                      {c.billingAddress ? (
                        <p className="mt-1 text-xs text-zinc-500">{c.billingAddress}</p>
                      ) : null}
                    </td>
                    <td className="p-3 text-zinc-700">
                      <p>{c.supplierKind ? supplierLabel(c.supplierKind) : "—"}</p>
                      <p className="mt-1 text-xs">
                        {c.users[0]?.name ?? "N/A"} ({c.users[0]?.email ?? "N/A"})
                      </p>
                      <p className="mt-1 text-xs text-zinc-600">{c.businessPhone ?? "No phone on file"}</p>
                      {c.remittanceEmail ? (
                        <p className="mt-1 text-xs text-zinc-600">AP {c.remittanceEmail}</p>
                      ) : null}
                    </td>
                    <td className="p-3">
                      <ul className="space-y-1 text-xs">
                        {docs.map((d) => (
                          <li key={d.id}>
                            <a
                              href={d.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-lob-navy underline"
                            >
                              {isCreditKind(d.kind) ? CREDIT_FILE_LABELS[d.kind] : d.kind}
                            </a>
                          </li>
                        ))}
                        {docs.length === 0 ? <li className="text-zinc-500">No credit links filed</li> : null}
                      </ul>
                    </td>
                    <td className="p-3">
                      {docsVerified ? (
                        <span className="rounded bg-emerald-100 px-2 py-1 text-xs text-emerald-900">Verified</span>
                      ) : (
                        <span className="rounded bg-amber-100 px-2 py-1 text-xs text-amber-900">Review required</span>
                      )}
                    </td>
                    <td className="p-3">
                      <span className={`rounded px-2 py-1 text-xs ${statusClass(c.verificationStatus)}`}>
                        {c.verificationStatus}
                      </span>
                    </td>
                    <td className="p-3">
                      <CarrierReviewActions
                        companyId={c.id}
                        analyticsEnabled={c.analyticsSubscriber}
                        docsVerified={docsVerified}
                        queue="suppliers"
                      />
                    </td>
                  </tr>
                );
              })}
              {suppliers.length === 0 && (
                <tr>
                  <td className="p-4 text-center text-zinc-500" colSpan={6}>
                    No supplier companies in the database yet.
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
