import { redirect } from "next/navigation";

import { LobBrandStrip } from "@/components/lob-brand-strip";
import { LobSidebar } from "@/components/lob-sidebar";
import { prisma } from "@/lib/prisma";
import { getActorContext } from "@/lib/request-context";

import { CarrierProfileForm } from "./carrier-profile-form";
import { InsuranceUploadForm } from "./upload-form";
import { DistanceUnitProfilePreference } from "@/components/distance-unit-profile-preference";

export const dynamic = "force-dynamic";

function parseTrailerJson(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export default async function CarrierCompliancePage() {
  const actor = await getActorContext();
  if (!actor.userId) {
    redirect("/sign-in");
  }
  if (actor.role !== "DISPATCHER" && actor.role !== "ADMIN") {
    return (
      <main className="min-h-[calc(100vh-3.5rem)] bg-zinc-100 p-6">
        <div className="mx-auto max-w-lg rounded-lg border bg-white p-6">
          <h1 className="text-lg font-semibold">Carrier profile</h1>
          <p className="mt-2 text-sm text-zinc-600">
            This area is for transport companies. Sign in with a carrier (dispatcher) account to manage DOT/MC,
            insurance, and fleet details shown to shippers after booking.
          </p>
        </div>
      </main>
    );
  }
  if (!actor.companyId) {
    return (
      <main className="min-h-[calc(100vh-3.5rem)] bg-zinc-100 p-6">
        <div className="mx-auto max-w-lg rounded-lg border bg-white p-6">
          <h1 className="text-lg font-semibold">Carrier profile</h1>
          <p className="mt-2 text-sm text-zinc-600">Link a carrier company under Your account first.</p>
        </div>
      </main>
    );
  }

  const company = await prisma.company.findUnique({
    where: { id: actor.companyId },
    select: {
      fleetTruckCount: true,
      fleetTrailerCount: true,
      trailerEquipmentTypes: true,
      carrierProfileBlurb: true,
      isOwnerOperator: true,
      factoringEligible: true,
      dotNumber: true,
      mcNumber: true,
      legalName: true,
    },
  });

  if (!company) {
    return null;
  }

  const equipmentCodes = parseTrailerJson(company.trailerEquipmentTypes);

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-zinc-100 p-3 text-zinc-900 sm:p-4">
      <div className="mx-auto flex max-w-[1600px] gap-0 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
        <LobSidebar active="carrierProfile" />
        <div className="min-w-0 flex-1 bg-zinc-50">
          <LobBrandStrip />
          <div className="p-4 sm:p-6">
            <div className="mx-auto max-w-3xl">
              <h1 className="text-2xl font-bold sm:text-3xl">Carrier profile</h1>
              <p className="mt-2 text-sm text-zinc-600">
                Store proof of your organization and fleet details. Shippers can review this after they book a load with
                you—before the truck arrives.
              </p>

              <div className="mt-5">
                <DistanceUnitProfilePreference persona="carrier" />
              </div>

              <section className="mt-6 rounded-lg border bg-white p-4">
                <h2 className="text-lg font-semibold">Authority</h2>
                <p className="mt-1 text-sm text-zinc-600">{company.legalName}</p>
                <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-semibold uppercase text-zinc-500">DOT</dt>
                    <dd className="font-medium">{company.dotNumber ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase text-zinc-500">MC</dt>
                    <dd className="font-medium">{company.mcNumber ?? "—"}</dd>
                  </div>
                </dl>
                <p className="mt-3 text-xs text-zinc-500">
                  Update legal authority through account onboarding or ask an admin if something changed.
                </p>
              </section>

              <InsuranceUploadForm />

              <CarrierProfileForm
                initialTruckCount={company.fleetTruckCount}
                initialTrailerCount={company.fleetTrailerCount}
                initialEquipmentCodes={equipmentCodes}
                initialBlurb={company.carrierProfileBlurb}
                initialOwnerOp={company.isOwnerOperator}
                factoringEligible={company.factoringEligible}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
