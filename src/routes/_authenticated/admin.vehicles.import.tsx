import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useRef, useState } from "react";
import {
  previewImport, commitImport, rollbackImport, cancelBatch,
  listBatches, getBatchRows, CSV_COLUMNS,
} from "@/lib/vehicle-import.functions";
import { Upload, FileText, CheckCircle2, XCircle, AlertTriangle, RotateCcw, Download, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/vehicles/import")({
  head: () => ({ meta: [{ title: "Import Vehicle Data | GMTL Admin" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: ImportPage,
});

const badge = (status: string) => {
  const map: Record<string,string> = {
    draft:"bg-gray-100 text-gray-700",
    previewed:"bg-blue-100 text-blue-800",
    committing:"bg-amber-100 text-amber-800",
    succeeded:"bg-green-100 text-green-800",
    failed:"bg-red-100 text-red-800",
    cancelled:"bg-gray-100 text-gray-600",
    rolled_back:"bg-purple-100 text-purple-800",
    partially_rolled_back:"bg-purple-100 text-purple-800",
    rollback_in_progress:"bg-amber-100 text-amber-800",
    rollback_failed:"bg-red-100 text-red-800",
    create:"bg-green-100 text-green-800",
    update:"bg-blue-100 text-blue-800",
    skip:"bg-gray-100 text-gray-700",
    invalid:"bg-red-100 text-red-800",
  };
  return <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-medium ${map[status] ?? "bg-gray-100 text-gray-700"}`}>{status}</span>;
};

const esc = (v: string) => v.replace(/[<>&]/g, c => ({ "<":"&lt;", ">":"&gt;", "&":"&amp;" }[c]!));

function downloadCSV(name: string, rows: string[][]) {
  const csv = rows.map(r => r.map(cell => {
    const s = String(cell ?? "");
    // neutralize formula prefixes for safe re-open in spreadsheets
    const safe = /^[=+\-@\t]/.test(s) ? `'${s}` : s;
    return /["\n,]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  }).join(",")).join("\n");
  const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click(); URL.revokeObjectURL(a.href);
}

function ImportPage() {
  const qc = useQueryClient();
  const previewFn = useServerFn(previewImport);
  const commitFn = useServerFn(commitImport);
  const rollbackFn = useServerFn(rollbackImport);
  const cancelFn = useServerFn(cancelBatch);
  const listFn = useServerFn(listBatches);
  const rowsFn = useServerFn(getBatchRows);

  const [step, setStep] = useState<"upload"|"preview"|"done">("upload");
  const [csvText, setCsvText] = useState<string>("");
  const [filename, setFilename] = useState<string>("");
  const [fileSize, setFileSize] = useState<number>(0);
  const [conflictStrategy, setConflictStrategy] = useState<"skip"|"update">("skip");
  const [allowPartial, setAllowPartial] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [filter, setFilter] = useState<string>("all");
  const [msg, setMsg] = useState<string | null>(null);
  const [openBatch, setOpenBatch] = useState<string | null>(null);
  const [detailRows, setDetailRows] = useState<any[] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const history = useQuery({ queryKey: ["vimport-batches"], queryFn: () => listFn() });

  const pMut = useMutation({
    mutationFn: async () => previewFn({ data: { filename, csv: csvText, conflict_strategy: conflictStrategy, allow_partial: allowPartial } }),
    onSuccess: (d) => { setPreview(d); setStep("preview"); qc.invalidateQueries({ queryKey: ["vimport-batches"] }); },
    onError: (e: any) => setMsg(e.message),
  });
  const cMut = useMutation({
    mutationFn: async () => commitFn({ data: { batchId: preview.batchId } }),
    onSuccess: (r: any) => { setMsg(`Import committed: ${r.created} created, ${r.updated} updated, ${r.skipped} skipped, ${r.failed} failed.`); setStep("done"); qc.invalidateQueries({ queryKey: ["vimport-batches"] }); },
    onError: (e: any) => setMsg(e.message),
  });
  const cancelMut = useMutation({
    mutationFn: async (id: string) => cancelFn({ data: { batchId: id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["vimport-batches"] }); setPreview(null); setStep("upload"); },
  });
  const rbMut = useMutation({
    mutationFn: async (id: string) => rollbackFn({ data: { batchId: id } }),
    onSuccess: (r: any) => { setMsg(`Rollback: ${r.reverted} reverted, ${r.skipped} skipped.`); qc.invalidateQueries({ queryKey: ["vimport-batches"] }); },
    onError: (e: any) => setMsg(e.message),
  });

  async function onFile(f: File) {
    if (!f) return;
    if (f.size > 8_000_000) { setMsg("File too large (max 8 MB)"); return; }
    const isXlsx = /\.(xlsx|xls)$/i.test(f.name);
    const isCsv = /\.csv$/i.test(f.name) || f.type === "text/csv";
    if (!isXlsx && !isCsv) { setMsg("CSV, XLS or XLSX files only"); return; }
    setMsg(null);
    try {
      let text: string;
      if (isXlsx) {
        const XLSX = await import("xlsx");
        const buf = await f.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        text = XLSX.utils.sheet_to_csv(ws);
      } else {
        text = await f.text();
      }
      const normalised = normaliseWorkbookCsv(text);
      setFilename(f.name); setFileSize(f.size); setCsvText(normalised);
    } catch (err: any) {
      setMsg(`Could not read file: ${err?.message ?? err}`);
    }
  }

  const filtered = useMemo(() => {
    if (!preview) return [];
    if (filter === "all") return preview.previews;
    return preview.previews.filter((p: any) => p.outcome === filter);
  }, [preview, filter]);

  async function downloadTemplate() {
    const rows: string[][] = [
      CSV_COLUMNS as unknown as string[],
      ["Toyota","Corolla","GLi 1.3","2NR-FE","1.3 VVT-i","1300","","petrol","sedan","PK","2014","2020","2014","2020",
       "same","195","65","15","","","","","","","","","","","","","","","","","","","","","","",
       "owner_manual","Toyota Corolla 2018 Owner Manual","https://example.com/manual.pdf","Standard PK-spec"],
      ["Honda","Civic","1.8 Oriel","R18Z1","1.8 SOHC i-VTEC","1800","","petrol","sedan","PK","2016","2021","2016","2021",
       "same","215","55","16","","","","","","","","","","","0W-20","","SN","","GF-5","","",
       "3.7","3.5","10000","6","owner_manual","Honda Civic 2018 Owner Manual","https://example.com/civic.pdf","OEM oil requirement"],
    ];
    downloadCSV("gmtl-vehicle-import-template.csv", rows);
  }

  function downloadErrors() {
    if (!preview) return;
    const rows: string[][] = [["row","outcome","make","model","errors","warnings"]];
    for (const p of preview.previews) {
      rows.push([
        String(p.row_number), p.outcome, p.make, p.model,
        p.errors.map((e: any) => `${e.field ?? ""}:${e.message}`).join(" | "),
        p.warnings.map((e: any) => e.message).join(" | "),
      ]);
    }
    downloadCSV(`vehicle-import-validation-${preview.batchId.slice(0,8)}.csv`, rows);
  }

  async function openBatchDetail(id: string) {
    setOpenBatch(id); setDetailRows(null);
    const r = await rowsFn({ data: { batchId: id } });
    setDetailRows(r);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl">Import Vehicle Data</h1>
          <p className="mt-1 text-sm text-muted-foreground">CSV import for vehicle configurations, OEM tyre sizes and engine-oil specs. Imported records start as <b>Needs Verification</b>.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={downloadTemplate} className="btn-outline text-sm"><Download className="h-4 w-4" /> Template</button>
          <Link to="/admin/vehicles/review" className="btn-outline text-sm">Review queue</Link>
          <Link to="/admin/vehicles" className="btn-outline text-sm">Back to vehicles</Link>
        </div>
      </div>

      {msg && <div className="mt-3 rounded-md bg-blue-50 p-2 text-xs text-blue-800">{msg}</div>}

      {/* Stepper */}
      <div className="mt-6 flex items-center gap-2 text-xs">
        {(["upload","preview","done"] as const).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <span className={`grid h-6 w-6 place-items-center rounded-full ${step===s ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>{i+1}</span>
            <span className={step===s ? "font-medium" : "text-muted-foreground"}>{s === "upload" ? "Upload" : s === "preview" ? "Validate & Preview" : "Confirm"}</span>
            {i<2 && <span className="mx-1 text-muted-foreground">→</span>}
          </div>
        ))}
      </div>

      {step === "upload" && (
        <div className="card-surface mt-4 bg-white p-6">
          <label className="block cursor-pointer rounded-lg border-2 border-dashed border-border p-8 text-center hover:border-primary" onDragOver={(e)=>e.preventDefault()} onDrop={(e)=>{e.preventDefault(); const f=e.dataTransfer.files?.[0]; if (f) onFile(f);}}>
            <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
            <div className="mt-2 text-sm font-medium">Drop a CSV or click to select</div>
            <div className="text-xs text-muted-foreground">Max 4 MB · UTF-8 · up to 2000 rows</div>
            <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e)=>e.target.files?.[0] && onFile(e.target.files[0])} />
          </label>
          {filename && (
            <div className="mt-4 rounded-md border border-border p-3 text-sm">
              <div className="flex items-center gap-2"><FileText className="h-4 w-4" /><span className="font-medium">{esc(filename)}</span><span className="text-xs text-muted-foreground">· {(fileSize/1024).toFixed(1)} KB</span></div>
            </div>
          )}
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="block text-sm">Conflict strategy
              <select value={conflictStrategy} onChange={(e)=>setConflictStrategy(e.target.value as any)} className="mt-1 h-9 w-full rounded border border-border bg-white px-2 text-sm">
                <option value="skip">Skip Existing (default)</option>
                <option value="update">Update Existing</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm mt-6">
              <input type="checkbox" checked={allowPartial} onChange={(e)=>setAllowPartial(e.target.checked)} />
              Import Valid Rows Only (allow partial)
              <span className="text-xs text-muted-foreground">— unchecked = Reject Whole Batch on any error</span>
            </label>
          </div>
          <div className="mt-5 flex justify-end">
            <button disabled={!csvText || pMut.isPending} onClick={() => pMut.mutate()} className="btn-primary text-sm">
              {pMut.isPending ? <><Loader2 className="h-4 w-4 animate-spin"/> Validating…</> : "Validate & Preview"}
            </button>
          </div>
        </div>
      )}

      {step === "preview" && preview && (
        <div className="card-surface mt-4 bg-white p-4">
          {preview.unknownHeaders?.length > 0 && (
            <div className="mb-3 rounded bg-amber-50 p-2 text-xs text-amber-900">
              Ignored unknown columns: {preview.unknownHeaders.map(esc).join(", ")}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3 text-xs">
            {["all","create","update","skip","invalid"].map(f => (
              <button key={f} onClick={()=>setFilter(f)} className={`rounded-full px-3 py-1 ${filter===f ? "bg-ink text-white" : "bg-muted"}`}>
                {f} {f==="all" ? `(${preview.previews.length})` : `(${preview.totals[f] ?? 0})`}
              </button>
            ))}
            <div className="ml-auto flex gap-2">
              <button onClick={downloadErrors} className="btn-outline text-xs"><Download className="h-3 w-3"/> Errors CSV</button>
              <button onClick={()=>cancelMut.mutate(preview.batchId)} className="btn-outline text-xs">Cancel</button>
            </div>
          </div>

          <div className="mt-3 max-h-[60vh] overflow-auto">
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase text-muted-foreground">
                <tr>
                  <th className="p-1 text-left">Row</th>
                  <th className="p-1 text-left">Outcome</th>
                  <th className="p-1 text-left">Make</th>
                  <th className="p-1 text-left">Model</th>
                  <th className="p-1 text-left">Summary</th>
                  <th className="p-1 text-left">Tyre</th>
                  <th className="p-1 text-left">Oil</th>
                  <th className="p-1 text-left">Errors / warnings</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p: any) => (
                  <tr key={p.row_number} className="border-t border-border align-top">
                    <td className="p-1">{p.row_number}</td>
                    <td className="p-1">{badge(p.outcome)}</td>
                    <td className="p-1">{esc(p.make)} <span className="text-[9px] text-muted-foreground">({p.make_action})</span></td>
                    <td className="p-1">{esc(p.model)} <span className="text-[9px] text-muted-foreground">({p.model_action})</span></td>
                    <td className="p-1">{esc(p.summary)}</td>
                    <td className="p-1">{p.has_tyre ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> : "—"}</td>
                    <td className="p-1">{p.has_oil ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> : "—"}</td>
                    <td className="p-1">
                      {p.errors.map((e: any, i: number) => <div key={i} className="text-red-700">✕ {esc(e.field ?? "")} {esc(e.message)}</div>)}
                      {p.warnings.map((e: any, i: number) => <div key={i} className="text-amber-700">⚠ {esc(e.message)}</div>)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button onClick={()=>{setStep("upload"); setPreview(null);}} className="btn-outline text-sm">Back</button>
            <button disabled={cMut.isPending || (!allowPartial && (preview.totals.invalid ?? 0) > 0)} onClick={()=>cMut.mutate()} className="btn-primary text-sm">
              {cMut.isPending ? <><Loader2 className="h-4 w-4 animate-spin"/> Importing…</> : "Confirm import"}
            </button>
          </div>
          {!allowPartial && (preview.totals.invalid ?? 0) > 0 && (
            <div className="mt-2 text-right text-xs text-red-700">Reject Whole Batch is on: fix invalid rows or enable Import Valid Rows Only.</div>
          )}
        </div>
      )}

      {step === "done" && (
        <div className="card-surface mt-4 bg-white p-6 text-center">
          <CheckCircle2 className="mx-auto h-8 w-8 text-green-600" />
          <div className="mt-2 font-medium">Import complete</div>
          <div className="mt-1 text-xs text-muted-foreground">All new records need admin verification. They are hidden from public pages until promoted.</div>
          <div className="mt-4 flex justify-center gap-2">
            <button onClick={()=>{setStep("upload"); setPreview(null); setCsvText(""); setFilename(""); setFileSize(0);}} className="btn-outline text-sm">Import another file</button>
            <Link to="/admin/vehicles/review" className="btn-primary text-sm">Open review queue</Link>
          </div>
        </div>
      )}

      {/* History */}
      <div className="mt-8">
        <h2 className="font-display text-lg">Import history</h2>
        <div className="card-surface mt-2 overflow-hidden bg-white">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 text-[10px] uppercase text-muted-foreground">
              <tr><th className="p-2 text-left">Date</th><th className="p-2 text-left">Filename</th><th className="p-2 text-left">Status</th><th className="p-2 text-left">Created</th><th className="p-2 text-left">Updated</th><th className="p-2 text-left">Skipped</th><th className="p-2 text-left">Failed</th><th className="p-2 text-left">Rollback</th><th></th></tr>
            </thead>
            <tbody>
              {(history.data ?? []).map((b: any) => {
                const t = b.totals ?? {};
                const canRb = b.status === "succeeded" && b.rollback_expires_at && new Date(b.rollback_expires_at) > new Date();
                return (
                  <tr key={b.id} className="border-t border-border">
                    <td className="p-2">{new Date(b.created_at).toLocaleString()}</td>
                    <td className="p-2">{esc(b.filename ?? "—")}</td>
                    <td className="p-2">{badge(b.status)}</td>
                    <td className="p-2">{t.created ?? "—"}</td>
                    <td className="p-2">{t.updated ?? "—"}</td>
                    <td className="p-2">{t.skipped ?? "—"}</td>
                    <td className="p-2">{t.failed ?? "—"}</td>
                    <td className="p-2 text-[10px]">{b.rollback_expires_at ? new Date(b.rollback_expires_at).toLocaleDateString() : "—"}</td>
                    <td className="p-2 text-right">
                      <button onClick={()=>openBatchDetail(b.id)} className="text-primary hover:underline mr-2">Details</button>
                      {canRb && <button onClick={()=>{if (confirm("Roll back this import? Records edited after import will be skipped.")) rbMut.mutate(b.id);}} className="text-red-700 hover:underline"><RotateCcw className="inline h-3 w-3"/> Rollback</button>}
                    </td>
                  </tr>
                );
              })}
              {(history.data ?? []).length === 0 && <tr><td colSpan={9} className="p-4 text-center text-muted-foreground">No imports yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {openBatch && detailRows && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={()=>setOpenBatch(null)}>
          <div className="w-full max-w-4xl max-h-[85vh] overflow-auto rounded-2xl bg-white p-5 shadow-xl" onClick={(e)=>e.stopPropagation()}>
            <div className="flex items-center justify-between"><h3 className="font-display text-lg">Batch rows</h3><button onClick={()=>setOpenBatch(null)} className="text-xs text-muted-foreground">Close</button></div>
            <table className="mt-3 w-full text-xs">
              <thead className="text-[10px] uppercase text-muted-foreground"><tr><th className="p-1 text-left">Row</th><th className="p-1 text-left">Status</th><th className="p-1 text-left">Action</th><th className="p-1 text-left">Target</th><th className="p-1 text-left">Notes</th></tr></thead>
              <tbody>
                {detailRows.map((r: any) => (
                  <tr key={r.row_number} className="border-t border-border">
                    <td className="p-1">{r.row_number}</td>
                    <td className="p-1">{badge(r.status)}</td>
                    <td className="p-1">{r.action ?? "—"}</td>
                    <td className="p-1 text-[10px]">{r.target_table ? `${r.target_table}#${(r.target_id ?? "").slice(0,8)}` : "—"}</td>
                    <td className="p-1 text-[10px]">{esc(r.error_message ?? "")} {r.source_payload_purged_at && <span className="text-muted-foreground">(payload purged)</span>}</td>
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
