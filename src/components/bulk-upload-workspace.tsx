"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import { BULK_HEADER_ROW, BULK_MAX_ROWS } from "@/lib/csv-bulk-load";

type ValidateResponse = {
  mode: "validate";
  totalRows: number;
  validRows: number;
  invalidRows: number;
  /** Hard upload cap (overflow rows are returned as failed). */
  maxRows?: number;
  /** True when the source CSV had more than maxRows; only the first maxRows were processed. */
  truncated?: boolean;
  results: Array<
    | { ok: true; rowIndex: number; data: Record<string, unknown> }
    | { ok: false; rowIndex: number; errors: string[]; raw: Record<string, string> }
  >;
};

type CommitResponse = {
  mode: "commit";
  totalRows: number;
  created: number;
  failed: number;
  results: Array<
    | { ok: true; rowIndex: number; loadId: string; referenceNumber: string }
    | { ok: false; rowIndex: number; errors: string[] }
  >;
};

type Phase = "idle" | "validated" | "committing" | "done";

export function BulkUploadWorkspace() {
  const [csvText, setCsvText] = useState<string>("");
  const [filename, setFilename] = useState<string>("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [validation, setValidation] = useState<ValidateResponse | null>(null);
  const [commit, setCommit] = useState<CommitResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const errorCsvUrl = useMemo<string | null>(() => {
    if (!validation || validation.invalidRows === 0) return null;
    const headers = [...BULK_HEADER_ROW, "_errors"];
    const escape = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
    const lines: string[] = [headers.map(escape).join(",")];
    for (const r of validation.results) {
      if (r.ok) continue;
      const cells = BULK_HEADER_ROW.map((h) => escape(r.raw?.[h] ?? ""));
      cells.push(escape(r.errors.join(" · ")));
      lines.push(cells.join(","));
    }
    const blob = new Blob([`${lines.join("\n")}\n`], { type: "text/csv;charset=utf-8" });
    return URL.createObjectURL(blob);
  }, [validation]);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    setCommit(null);
    setValidation(null);
    setPhase("idle");
    setFilename(file.name);
    const text = await file.text();
    setCsvText(text);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const f = e.dataTransfer.files?.[0];
      if (f) void handleFile(f);
    },
    [handleFile],
  );

  async function runValidate() {
    if (!csvText.trim()) {
      setError("Please pick or drop a CSV file first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/loads/bulk?mode=validate", {
        method: "POST",
        headers: { "content-type": "text/csv" },
        body: csvText,
      });
      const json = (await res.json()) as ValidateResponse | { error?: string };
      if (!res.ok) throw new Error("error" in json && json.error ? json.error : "Validation failed");
      setValidation(json as ValidateResponse);
      setPhase("validated");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to validate CSV");
    } finally {
      setBusy(false);
    }
  }

  async function runCommit() {
    if (!csvText.trim()) return;
    if (!validation || validation.validRows === 0) {
      setError("No valid rows to commit.");
      return;
    }
    setBusy(true);
    setPhase("committing");
    setError(null);
    try {
      const res = await fetch("/api/loads/bulk?mode=commit", {
        method: "POST",
        headers: { "content-type": "text/csv" },
        body: csvText,
      });
      const json = (await res.json()) as CommitResponse | { error?: string };
      if (!res.ok) throw new Error("error" in json && json.error ? json.error : "Commit failed");
      setCommit(json as CommitResponse);
      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to post loads");
      setPhase("validated");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6">
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        className="rounded-xl border-2 border-dashed border-stone-300 bg-stone-50/60 p-6 text-center"
      >
        <input
          type="file"
          ref={fileRef}
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
          }}
        />
        <p className="text-sm font-semibold text-stone-700">Drop a CSV file here</p>
        <p className="mt-1 text-xs text-stone-500">
          {filename ? `Loaded: ${filename}` : "or click to browse — only the header row + data rows"}
        </p>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="mt-3 rounded-md bg-stone-800 px-4 py-1.5 text-xs font-semibold text-white hover:bg-stone-900"
        >
          Choose file
        </button>
      </div>

      {error && (
        <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
          {error}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={runValidate}
          disabled={busy || !csvText.trim()}
          className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy && phase !== "committing" ? "Validating…" : "Validate CSV"}
        </button>
        {validation && validation.validRows > 0 && phase !== "done" && (
          <button
            type="button"
            onClick={runCommit}
            disabled={busy}
            className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy && phase === "committing"
              ? `Posting ${validation.validRows} loads…`
              : `Post ${validation.validRows} valid load${validation.validRows === 1 ? "" : "s"}`}
          </button>
        )}
        {phase === "done" && commit && (
          <span className="rounded-md bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-900 ring-1 ring-emerald-200">
            ✓ {commit.created} created · {commit.failed} failed
          </span>
        )}
      </div>

      {validation && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold">
            Validation results · {validation.validRows} valid / {validation.invalidRows} invalid (of{" "}
            {validation.totalRows})
          </h3>
          {validation.truncated && (
            <div className="mt-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              This file is larger than the {validation.maxRows ?? BULK_MAX_ROWS}-row upload cap. Rows past the cap were
              flagged as failed — split the file and re-upload the rest.
            </div>
          )}
          {validation.invalidRows > 0 && (
            <div className="mt-2 rounded-lg border border-rose-200 bg-rose-50/50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-rose-900">Errors per row</h4>
                {errorCsvUrl && (
                  <a
                    href={errorCsvUrl}
                    download={`${(filename || "loads").replace(/\.csv$/i, "")}_errors.csv`}
                    className="rounded-md bg-rose-700 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-rose-800"
                    title="Download a CSV containing only the failed rows + the reason. Fix the cells and re-upload to retry."
                  >
                    ↓ Download errors-only CSV
                  </a>
                )}
              </div>
              <p className="mt-1 text-[11px] text-rose-900/80">
                Open the errors-only CSV in Excel/Numbers, fix the rows, save, and re-upload. The rest of the file is
                already validated — you only need to retry the failures.
              </p>
              <ul className="mt-2 max-h-72 space-y-1 overflow-y-auto text-xs">
                {validation.results
                  .filter((r): r is Extract<ValidateResponse["results"][number], { ok: false }> => !r.ok)
                  .map((r) => (
                    <li key={r.rowIndex} className="rounded bg-white p-2 ring-1 ring-rose-200">
                      <span className="font-mono font-semibold text-rose-900">Row {r.rowIndex}:</span>{" "}
                      <span className="text-rose-800">{r.errors.join(" · ")}</span>
                    </li>
                  ))}
              </ul>
            </div>
          )}
          {validation.validRows > 0 && validation.invalidRows === 0 && (
            <p className="mt-2 rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-900 ring-1 ring-emerald-200">
              All rows look good. Click the button above to post them.
            </p>
          )}
        </div>
      )}

      {commit && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold">
            Commit results · {commit.created} created / {commit.failed} failed
          </h3>
          <div className="mt-2 max-h-80 overflow-y-auto rounded-lg border border-stone-200 bg-white">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-[10px] uppercase tracking-wide text-stone-500">
                <tr>
                  <th className="px-2 py-1.5">Row</th>
                  <th className="px-2 py-1.5">Status</th>
                  <th className="px-2 py-1.5">Reference</th>
                  <th className="px-2 py-1.5">Detail</th>
                </tr>
              </thead>
              <tbody>
                {commit.results.map((r) => (
                  <tr key={r.rowIndex} className="border-t border-stone-100">
                    <td className="px-2 py-1 font-mono">{r.rowIndex}</td>
                    {r.ok ? (
                      <>
                        <td className="px-2 py-1 text-emerald-800">✓ created</td>
                        <td className="px-2 py-1 font-mono">
                          <a
                            href={`/loads/${r.loadId}`}
                            className="text-emerald-800 underline"
                            target="_blank"
                            rel="noreferrer"
                          >
                            {r.referenceNumber}
                          </a>
                        </td>
                        <td className="px-2 py-1 text-stone-500">—</td>
                      </>
                    ) : (
                      <>
                        <td className="px-2 py-1 text-rose-800">✗ skipped</td>
                        <td className="px-2 py-1 text-stone-400">—</td>
                        <td className="px-2 py-1 text-rose-800">{r.errors.join(" · ")}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
