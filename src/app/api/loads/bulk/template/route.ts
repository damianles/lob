import { buildTemplateCsv, buildTemplateHelpCsv } from "@/lib/csv-bulk-load";

/**
 * Downloadable CSV template + a separate "help" variant. Hitting
 *   /api/loads/bulk/template          → blank template + 1 example row
 *   /api/loads/bulk/template?help=1   → headers + per-column documentation
 */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const wantHelp = u.searchParams.has("help");
  const csv = wantHelp ? buildTemplateHelpCsv() : buildTemplateCsv();
  const filename = wantHelp ? "lob-bulk-load-help.csv" : "lob-bulk-load-template.csv";

  return new Response("\ufeff" + csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}
