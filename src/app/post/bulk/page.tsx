import Link from "next/link";

import { LobBrandStrip } from "@/components/lob-brand-strip";
import { LobSidebar } from "@/components/lob-sidebar";
import { BulkUploadWorkspace } from "@/components/bulk-upload-workspace";
import { BULK_COLUMNS } from "@/lib/csv-bulk-load";
import { getActorContext } from "@/lib/request-context";

export const dynamic = "force-dynamic";

export default async function BulkPostPage() {
  const actor = await getActorContext();

  if (!actor.userId) {
    return (
      <main className="mx-auto max-w-lg p-8">
        <h1 className="text-xl font-bold">Bulk-post loads</h1>
        <p className="mt-2 text-sm text-zinc-600">Sign in to upload your weekly loads.</p>
        <Link href="/sign-in" className="mt-4 inline-block text-lob-navy underline">
          Sign in
        </Link>
      </main>
    );
  }

  if (actor.role !== "SHIPPER") {
    return (
      <main className="min-h-[calc(100vh-3.5rem)] bg-lob-paper text-stone-900">
        <div className="mx-auto flex max-w-[1600px] gap-0 rounded-lg border border-zinc-200 bg-white shadow-sm">
          <LobSidebar active="loads" />
          <div className="min-w-0 flex-1 p-8">
            <LobBrandStrip />
            <h1 className="mt-4 text-2xl font-bold">Bulk-post loads</h1>
            <p className="mt-2 text-sm text-zinc-600">
              Bulk uploads are for mills and wholesalers (shipper accounts). Carriers don&apos;t post freight.
            </p>
            <Link href="/" className="mt-4 inline-block font-medium text-lob-navy underline">
              Back to load board
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-lob-paper text-stone-900">
      <div className="mx-auto flex max-w-[1600px] gap-0 rounded-lg border border-zinc-200 bg-white shadow-sm">
        <LobSidebar active="loads" />
        <div className="min-w-0 flex-1">
          <LobBrandStrip />
          <div className="p-6 lg:p-8">
            <div className="mb-2 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold text-zinc-900">Bulk-post loads (CSV)</h1>
                <p className="mt-2 max-w-3xl text-sm text-zinc-600">
                  Drop a filled-out copy of our template to post many loads at once. We validate every row up
                  front so you see exactly what&apos;s wrong before anything is committed.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/api/loads/bulk/template"
                  className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
                >
                  Download blank template
                </Link>
                <Link
                  href="/api/loads/bulk/template?help=1"
                  className="rounded-lg border border-emerald-700 bg-white px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50"
                >
                  Download column legend
                </Link>
              </div>
            </div>

            <details className="mt-4 rounded-lg border border-stone-200 bg-stone-50 p-4 text-xs">
              <summary className="cursor-pointer text-sm font-semibold text-stone-800">
                CSV format reference ({BULK_COLUMNS.length} columns)
              </summary>
              <table className="mt-3 w-full border-collapse text-left">
                <thead>
                  <tr className="text-stone-500">
                    <th className="py-1 pr-3 font-semibold uppercase tracking-wide">Column</th>
                    <th className="py-1 pr-3 font-semibold uppercase tracking-wide">Required</th>
                    <th className="py-1 pr-3 font-semibold uppercase tracking-wide">Help</th>
                    <th className="py-1 font-semibold uppercase tracking-wide">Example</th>
                  </tr>
                </thead>
                <tbody>
                  {BULK_COLUMNS.map((c) => (
                    <tr key={c.header} className="border-t border-stone-200">
                      <td className="py-1 pr-3 font-mono text-[11px] text-stone-800">{c.header}</td>
                      <td className="py-1 pr-3">
                        {c.required ? (
                          <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-800">
                            required
                          </span>
                        ) : (
                          <span className="text-stone-400">optional</span>
                        )}
                      </td>
                      <td className="py-1 pr-3 text-stone-700">{c.help}</td>
                      <td className="py-1 font-mono text-[11px] text-stone-600">{c.example ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>

            <BulkUploadWorkspace />
          </div>
        </div>
      </div>
    </main>
  );
}
