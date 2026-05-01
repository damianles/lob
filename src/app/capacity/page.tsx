import { LobBrandStrip } from "@/components/lob-brand-strip";
import { CapacityWorkspace } from "@/components/capacity-workspace";
import { CapacityPageIntro } from "@/components/capacity-page-intro";
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
            <CapacityPageIntro />
            <div className="mt-8">
              <CapacityWorkspace />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
