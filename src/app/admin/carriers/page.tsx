import { VerificationStatus } from "@prisma/client";

import { CarrierTypeTag } from "@/components/carrier-type-tag";
import { LobBrandStrip } from "@/components/lob-brand-strip";
import { formatCoverageUsd } from "@/lib/carrier-performance";
import { CREDIT_FILE_LABELS, type CreditFileKind } from "@/lib/credit-file";
import { prisma } from "@/lib/prisma";
import { CarrierReviewActions } from "./review-actions";

export const dynamic = "force-dynamic";

function statusClass(status: VerificationStatus) {
  if (status === VerificationStatus.PENDING) return "bg-amber-100 text-amber-900";
  if (status === VerificationStatus.APPROVED) return "bg-emerald-100 text-emerald-900";
  return "bg-rose-100 text-rose-900";
}

function isCreditKind(kind: string): kind is CreditFileKind {
  return kind === "W9" || kind === "CREDIT_REFERENCE" || kind === "INSURANCE" || kind === "BUSINESS_REGISTRATION";
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
      documents: {
        where: {
          dispatchLinkId: null,
          kind: { in: ["W9", "CREDIT_REFERENCE", "INSURANCE", "BUSINESS_REGISTRATION"] },
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          kind: true,
          fileUrl: true,
          expiresAt: true,
          cargoCoverageUsd: true,
          autoLiabilityCoverageUsd: true,
        },
      },
    },
    orderBy: [{ verificationStatus: "asc" }, { createdAt: "desc" }],
  });

  return (
    <main className="min-h-screen bg-zinc-50 p-6 text-zinc-900">
      <div className="mx-auto max-w-5xl">
        <LobBrandStrip />
        <h1 className="mt-4 text-3xl font-bold">Carrier Verification Queue</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Asset fleets and brokers must be approved before they can book loads. Open each credit link, confirm the
          legal name, and confirm the COI cargo/auto amounts match what the carrier typed before Approve.
        </p>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-xs text-zinc-600">
          <li>Open the certificate of insurance. Compare cargo and auto liability to the amounts shown.</li>
          <li>Click Confirm insurance matches input when the file matches the carrier entry.</li>
          <li>Open W-9 and credit reference; confirm legal name matches registration.</li>
          <li>Mark docs verified, then Approve (or Reject).</li>
        </ol>

        <div className="mt-6 overflow-x-auto rounded-lg border bg-white">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="p-3">Company</th>
                <th className="p-3">Type / DOT·MC</th>
                <th className="p-3">Contact</th>
                <th className="p-3">Credit file</th>
                <th className="p-3">Insurance input</th>
                <th className="p-3">Docs</th>
                <th className="p-3">Status</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {carriers.map((carrier) => {
                const seen = new Set<string>();
                const docs = carrier.documents.filter((d) => {
                  if (!isCreditKind(d.kind) || seen.has(d.kind)) return false;
                  seen.add(d.kind);
                  return true;
                });
                const docsVerified = Boolean(carrier.creditDocsVerifiedAt);
                const insuranceVerified = Boolean(carrier.insuranceCoverageVerifiedAt);
                const insuranceDoc = docs.find((d) => d.kind === "INSURANCE");
                return (
                  <tr key={carrier.id} className="border-b align-top">
                    <td className="p-3">
                      <p className="font-medium">{carrier.legalName}</p>
                      {carrier.billingAddress ? (
                        <p className="mt-1 text-xs text-zinc-500">{carrier.billingAddress}</p>
                      ) : null}
                    </td>
                    <td className="p-3">
                      <CarrierTypeTag
                        carrierType={carrier.carrierType}
                        isOwnerOperator={carrier.isOwnerOperator}
                      />
                      <p className="mt-1 text-xs text-zinc-600">
                        Region: {carrier.authorityRegion ?? "—"}
                      </p>
                      <p className="mt-1 text-xs text-zinc-600">
                        DOT/MC: {carrier.dotNumber ?? "-"} / {carrier.mcNumber ?? "-"}
                      </p>
                      {(carrier.caBusinessNumber || carrier.caSafetyNumber) && (
                        <p className="mt-1 text-xs text-zinc-600">
                          CA BN {carrier.caBusinessNumber ?? "—"} · {carrier.caSafetyProvince ?? "??"}{" "}
                          {carrier.caSafetyNumber ?? "—"}
                        </p>
                      )}
                      {carrier.brokerAttestedAt ? (
                        <p className="mt-1 text-[10px] text-zinc-500">
                          Broker attested {carrier.brokerAttestedAt.toISOString().slice(0, 10)}
                        </p>
                      ) : null}
                    </td>
                    <td className="p-3 text-zinc-700">
                      <p className="text-xs">
                        {carrier.users[0]?.name ?? "N/A"} ({carrier.users[0]?.email ?? "N/A"})
                      </p>
                      <p className="mt-1 text-xs text-zinc-600">{carrier.businessPhone ?? "No phone on file"}</p>
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
                              {d.expiresAt ? ` (exp ${d.expiresAt.toISOString().slice(0, 10)})` : ""}
                            </a>
                          </li>
                        ))}
                        {docs.length === 0 ? <li className="text-zinc-500">No credit links filed</li> : null}
                      </ul>
                    </td>
                    <td className="p-3 text-xs text-zinc-700">
                      {insuranceDoc ? (
                        <div className="space-y-1">
                          <p>
                            Cargo{" "}
                            <span className="font-semibold tabular-nums">
                              {formatCoverageUsd(insuranceDoc.cargoCoverageUsd)}
                            </span>
                          </p>
                          <p>
                            Auto{" "}
                            <span className="font-semibold tabular-nums">
                              {formatCoverageUsd(insuranceDoc.autoLiabilityCoverageUsd)}
                            </span>
                          </p>
                          <p className="text-[10px] text-zinc-500">
                            Carrier-entered · compare to open COI link
                          </p>
                          {insuranceVerified ? (
                            <span className="inline-block rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] text-emerald-900">
                              Limits confirmed
                            </span>
                          ) : (
                            <span className="inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-900">
                              Needs COI match
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-zinc-500">No COI filed</span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-col gap-1">
                        {insuranceVerified ? (
                          <span className="rounded bg-emerald-100 px-2 py-1 text-xs text-emerald-900">
                            Insurance OK
                          </span>
                        ) : (
                          <span className="rounded bg-amber-100 px-2 py-1 text-xs text-amber-900">
                            Insurance review
                          </span>
                        )}
                        {docsVerified ? (
                          <span className="rounded bg-emerald-100 px-2 py-1 text-xs text-emerald-900">
                            Docs verified
                          </span>
                        ) : (
                          <span className="rounded bg-amber-100 px-2 py-1 text-xs text-amber-900">
                            Docs review
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <span className={`rounded px-2 py-1 text-xs ${statusClass(carrier.verificationStatus)}`}>
                        {carrier.verificationStatus}
                      </span>
                    </td>
                    <td className="p-3">
                      <CarrierReviewActions
                        companyId={carrier.id}
                        analyticsEnabled={carrier.analyticsSubscriber}
                        docsVerified={docsVerified}
                        insuranceVerified={insuranceVerified}
                        queue="carriers"
                      />
                    </td>
                  </tr>
                );
              })}
              {carriers.length === 0 && (
                <tr>
                  <td className="p-4 text-center text-zinc-500" colSpan={8}>
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
