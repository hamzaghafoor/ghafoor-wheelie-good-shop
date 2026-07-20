import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import {
  previewCatalogueImport, listCatalogueBatches, rollbackCatalogueImport,
} from "@/lib/catalogue-import.functions";
import { Upload, RotateCcw, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/catalogue/import")({
  head: () => ({ meta: [{ title: "Import Catalogue | GMTL Admin" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: ImportLanding,
});

const badge = (s: string) => {
  const map: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700", previewed: "bg-blue-100 text-blue-800",
    committing: "bg-amber-100 text-amber-800", succeeded: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800", cancelled: "bg-gray-100 text-gray-600",
    rolled_back: "bg-purple-100 text-purple-800", partially_rolled_back: "bg-purple-100 text-purple-800",
    rollback_in_progress: "bg-amber-100 text-amber-800", rollback_failed: "bg-red-100 text-red-800",
  };
  return <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-medium ${map[s] ?? "bg-gray-100 text-gray-700"}`}>{s}</span>;
};

function ImportLanding() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const previewFn = useServerFn(previewCatalogueImport);
  const listFn = useServerFn(listCatalogueBatches);
  const rbFn = useServerFn(rollbackCatalogueImport);

  const [file, setFile] = useState<File | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const history = useQuery({ queryKey: ["cat-batches"], queryFn: () => listFn() });

  const mut = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Select a file first.");
      const buf = new Uint8Array(await file.arrayBuffer());
      let bin = ""; for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
      const b64 = typeof btoa === "function" ? btoa(bin) : Buffer.from(bin, "binary").toString("base64");
      return previewFn({ data: { filename: file.name, fileB64: b64, mime: file.type } });
    },
    onSuccess: (r: any) => {
      qc.invalidateQueries({ queryKey: ["cat-batches"] });
      nav({ to: "/admin/catalogue/import/$batchId", params: { batchId: r.batchId } });
    },
    onError: (e: any) => setMsg(e.message),
  });

  const rbMut = useMutation({
    mutationFn: async (id: string) => rbFn({ data: { batchId: id } }),
    onSuccess: (r: any) => { setMsg(`Rollback: ${r.reverted} reverted, ${r.skipped} skipped.`); qc.invalidateQueries({ queryKey: ["cat-batches"] }); },
    onError: (e: any) => setMsg(e.message),
  });

  function onFile(f: File) {
    if (f.size > 6_000_000) { setMsg("File too large (max 6 MB)."); return; }
    if (!/\.(csv|xlsx|xls)$/i.test(f.name)) { setMsg("Only .csv, .xls or .xlsx files are supported."); return; }
    setFile(f); setMsg(null);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl">Import Catalogue</h1>
          <p className="mt-1 text-sm text-muted-foreground">Upload an ERP export (.xls, .xlsx or .csv). Every imported product stays in <b>Draft</b> with availability <b>Check Availability</b>. Files are parsed in memory and not stored.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin/catalogue/review" className="btn-outline text-sm">Review queue</Link>
          <Link to="/admin/catalogue" className="btn-outline text-sm">Back to catalogue</Link>
        </div>
      </div>

      {msg && <div className="mt-3 rounded-md bg-blue-50 p-2 text-xs text-blue-800">{msg}</div>}

      <div className="card-surface mt-6 bg-white p-6">
        <label
          className="block cursor-pointer rounded-lg border-2 border-dashed border-border p-8 text-center hover:border-primary"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) onFile(f); }}
        >
          <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
          <div className="mt-2 text-sm font-medium">Drop a spreadsheet or click to select</div>
          <div className="text-xs text-muted-foreground">Max 6 MB · up to 10 worksheets · up to 5,000 rows per sheet</div>
          <input ref={inputRef} type="file" accept=".csv,.xls,.xlsx,text/csv" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        </label>
        {file && (
          <div className="mt-3 flex items-center justify-between rounded-md border border-border p-3 text-sm">
            <div>
              <div className="font-medium">{file.name}</div>
              <div className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</div>
            </div>
            <button disabled={mut.isPending} onClick={() => mut.mutate()} className="btn-primary text-sm">
              {mut.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Parsing…</> : "Parse & preview"}
            </button>
          </div>
        )}
      </div>

      <div className="mt-8">
        <h2 className="font-display text-lg">Import history</h2>
        <div className="card-surface mt-2 overflow-hidden bg-white">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 text-[10px] uppercase text-muted-foreground">
              <tr>
                <th className="p-2 text-left">Date</th><th className="p-2 text-left">Filename</th>
                <th className="p-2 text-left">Status</th><th className="p-2 text-left">Families</th>
                <th className="p-2 text-left">Variants</th><th className="p-2 text-left">Updated</th>
                <th className="p-2 text-left">Skipped</th><th className="p-2 text-left">Rollback</th><th></th>
              </tr>
            </thead>
            <tbody>
              {(history.data ?? []).map((b: any) => {
                const t = b.totals ?? {};
                const canRb = b.status === "succeeded" && b.rollback_expires_at && new Date(b.rollback_expires_at) > new Date();
                return (
                  <tr key={b.id} className="border-t border-border">
                    <td className="p-2">{new Date(b.created_at).toLocaleString()}</td>
                    <td className="p-2">{b.filename ?? "—"}</td>
                    <td className="p-2">{badge(b.status)}</td>
                    <td className="p-2">{t.created_families ?? "—"}</td>
                    <td className="p-2">{t.added_variants ?? "—"}</td>
                    <td className="p-2">{t.updated_variants ?? "—"}</td>
                    <td className="p-2">{t.skipped ?? "—"}</td>
                    <td className="p-2 text-[10px]">{b.rollback_expires_at ? new Date(b.rollback_expires_at).toLocaleDateString() : "—"}</td>
                    <td className="p-2 text-right">
                      <Link to="/admin/catalogue/import/$batchId" params={{ batchId: b.id }} className="text-primary hover:underline mr-2">Open</Link>
                      {canRb && <button onClick={() => { if (confirm("Roll back this import? Records edited after import will be skipped.")) rbMut.mutate(b.id); }} className="text-red-700 hover:underline"><RotateCcw className="inline h-3 w-3" /> Rollback</button>}
                    </td>
                  </tr>
                );
              })}
              {(history.data ?? []).length === 0 && <tr><td colSpan={9} className="p-4 text-center text-muted-foreground">No catalogue imports yet.</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">Note: raw row payloads are purged 30 days after import. After expiry, batch metadata and summary remain but preview edits are no longer possible.</p>
      </div>
    </div>
  );
}
