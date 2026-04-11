import { LobSidebar } from "@/components/lob-sidebar";

import { InsuranceUploadForm } from "./upload-form";

export const dynamic = "force-dynamic";

export default async function CarrierCompliancePage() {
  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-zinc-100 p-3 text-zinc-900 sm:p-4">
      <div className="mx-auto flex max-w-[1600px] gap-0 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
        <LobSidebar active="compliance" />
        <div className="min-w-0 flex-1 bg-zinc-50 p-4 sm:p-6">
          <div className="mx-auto max-w-3xl">
            <h1 className="text-2xl font-bold sm:text-3xl">Truck paperwork</h1>
            <p className="mt-2 text-sm text-zinc-600">
              Add your insurance certificate link and expiry so we can keep you eligible to book and get renewal
              reminders.
            </p>
            <InsuranceUploadForm />
          </div>
        </div>
      </div>
    </main>
  );
}

