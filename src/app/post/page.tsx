import Link from "next/link";
import { redirect } from "next/navigation";

import { SupplierPostWorkspace } from "@/components/supplier-post-workspace";
import { prisma } from "@/lib/prisma";
import { getActorContext } from "@/lib/request-context";

export const dynamic = "force-dynamic";

export default async function PostLoadPage() {
  const actor = await getActorContext();

  if (!actor.userId) {
    redirect("/sign-in?redirect_url=/post");
  }

  if (actor.role !== "SHIPPER" || !actor.companyId) {
    return (
      <main className="min-h-[calc(100vh-3.5rem)] bg-lob-paper px-4 py-10 text-stone-900">
        <div className="mx-auto max-w-lg rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold">Post a Load</h1>
          <p className="mt-2 text-sm text-stone-600">
            Only supplier accounts with a linked company can post loads.
            {actor.role === "SHIPPER" && !actor.companyId
              ? " Finish account setup to link your company first."
              : ""}
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            {actor.role === "SHIPPER" && !actor.companyId ? (
              <Link href="/onboarding" className="font-medium text-lob-navy underline">
                Account setup
              </Link>
            ) : null}
            <Link href="/" className="font-medium text-lob-navy underline">
              Back to loads
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const company = await prisma.company.findUnique({
    where: { id: actor.companyId },
    select: { legalName: true },
  });

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-lob-paper px-3 py-3 text-stone-900 sm:px-4">
      <SupplierPostWorkspace companyName={company?.legalName ?? null} />
    </main>
  );
}
