import { LobBrandStrip } from "@/components/lob-brand-strip";
import { CapacityWorkspace } from "@/components/capacity-workspace";
import { LobSidebar } from "@/components/lob-sidebar";

export const dynamic = "force-dynamic";

export default function CapacityPage() {
  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-lob-paper text-stone-900">
      <div className="mx-auto flex max-w-[1600px] gap-0 rounded-lg border border-zinc-200 bg-white shadow-sm">
        <LobSidebar active="capacity" />
        <div className="min-w-0 flex-1">
          <LobBrandStrip />
          <div className="p-6 lg:p-8">
            <h1 className="text-2xl font-bold text-zinc-900">Capacity</h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-600">
              Carriers publish available trucks by lane and date window. Suppliers search without seeing carrier names
              on the open board. Use{" "}
              <a className="font-medium text-lob-navy underline" href="/shipper/carrier-preferences">
                Carrier preferences
              </a>{" "}
              to hide carriers you never want to book. Booked freight and dispatch stay on the{" "}
              <a className="font-medium text-lob-navy underline" href="/booked">
                Booked freight
              </a>{" "}
              page.
            </p>
            <div className="mt-8">
              <CapacityWorkspace />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
