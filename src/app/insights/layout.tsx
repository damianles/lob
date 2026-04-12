import { LobBrandStrip } from "@/components/lob-brand-strip";
import { InsightsSubnav } from "@/components/insights-subnav";
import { LobSidebar } from "@/components/lob-sidebar";

export default function InsightsLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-lob-paper text-stone-900">
      <div className="mx-auto flex max-w-[1600px] gap-0 rounded-lg border border-zinc-200 bg-white shadow-sm">
        <LobSidebar active="insights" />
        <div className="min-w-0 flex-1">
          <LobBrandStrip />
          <div className="p-6 lg:p-8">
            <InsightsSubnav />
            {children}
          </div>
        </div>
      </div>
    </main>
  );
}
