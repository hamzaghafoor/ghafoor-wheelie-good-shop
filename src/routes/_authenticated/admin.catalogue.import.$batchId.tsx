import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import {
  getCataloguePreview, confirmCatalogueBrand, updateCataloguePreviewRow,
  bulkUpdateCataloguePreviewRows, groupCatalogueRows, ungroupCatalogueRow,
  commitCatalogueImport, cancelCatalogueBatch, getCatalogueImportLookups,
  rollbackCatalogueImport, searchBrandsForImport,
} from "@/lib/catalogue-import.functions";
import { AlertTriangle, CheckCircle2, Loader2, Users, Ungroup, RotateCcw } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/catalogue/import/$batchId")({
  head: () => ({ meta: [{ title: "Preview Import | GMTL Admin" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: PreviewPage,
});

const CATEGORIES = ["tyres", "lubricants", "filters", "maintenance_parts", "car_care", "additives", "accessories", "services"] as const;
const ACTIONS = ["create_family", "add_variant", "update_variant", "skip", "needs_review", "invalid"] as const;
const UNITS = ["L", "ml", "g", "kg", "pcs", "pack", "set"];

const badge = (s: string) => {
  const map: Record<string, string> = {
    create_family: "bg-green-100 text-green-800", add_variant: "bg-green-50 text-green-700",
    update_variant: "bg-blue-100 text-blue-800", skip: "bg-gray-100 text-gray-700",
    needs_review: "bg-amber-100 text-amber-800", invalid: "bg-red-100 text-red-800",
    draft: "bg-gray-100", previewed: "bg-blue-100 text-blue-800", succeeded: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800", rolled_back: "bg-purple-100 text-purple-800",
    partially_rolled_back: "bg-purple-100 text-purple-800",
  };
  return <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-medium ${map[s] ?? "bg-gray-100"}`}>{s}</span>;
};

function PreviewPage() {
  const { batchId } = Route.useParams();
  const qc = useQueryClient();
  const getFn = useServerFn(getCataloguePreview);
  const brandFn = useServerFn(confirmCatalogueBrand);
  const updateFn = useServerFn(updateCataloguePreviewRow);
  const bulkFn = useServerFn(bulkUpdateCataloguePreviewRows);
  const groupFn = useServerFn(groupCatalogueRows);
  const ungroupFn = useServerFn(ungroupCatalogueRow);
  const commitFn = useServerFn(commitCatalogueImport);
  const cancelFn = useServerFn(cancelCatalogueBatch);
  const rbFn = useServerFn(rollbackCatalogueImport);
  const lookupsFn = useServerFn(getCatalogueImportLookups);
  const searchFn = useServerFn(searchBrandsForImport);

  const q = useQuery({ queryKey: ["cat-preview", batchId], queryFn: () => getFn({ data: { batchId } }) });
  const lookups = useQuery({ queryKey: ["cat-lookups"], queryFn: () => lookupsFn() });

  const [msg, setMsg] = useState<string | null>(null);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [brandPick, setBrandPick] = useState<{ mode: "existing" | "new"; brandId?: string; name?: string }>({ mode: "existing" });
  const [brandSearch, setBrandSearch] = useState("");
  const brandSearchQ = useQuery({ queryKey: ["b-search", brandSearch], queryFn: () => searchFn({ data: { q: brandSearch } }), enabled: brandSearch.length >= 2 });

  const batch = q.data?.batch;
  const rows = q.data?.rows ?? [];
  const preview = (batch?.totals as any)?.preview ?? {};
  const decision = preview.brand_decision;

  const filtered = useMemo(() => {
    let out = rows;
    if (filter !== "all") out = out.filter((r: any) => (r.source_payload?.action) === filter);
    if (search.trim()) {
      const s = search.toLowerCase();
      out = out.filter((r: any) =>
        (r.source_payload?.erp_description ?? "").toLowerCase().includes(s) ||
        (r.source_payload?.erp_stock_id ?? "").toLowerCase().includes(s) ||
        (r.source_payload?.product?.name ?? "").toLowerCase().includes(s));
    }
    return out;
  }, [rows, filter, search]);

  async function patchRow(rowId: string, patch: any) {
    await updateFn({ data: { batchId, rowId, patch } });
    qc.invalidateQueries({ queryKey: ["cat-preview", batchId] });
  }

  async function bulkPatch(patch: any) {
    if (sel.size === 0) return;
    await bulkFn({ data: { batchId, rowIds: [...sel], patch } });
    qc.invalidateQueries({ queryKey: ["cat-preview", batchId] });
  }

  async function groupSelected() {
    if (sel.size < 2) { setMsg("Select at least 2 rows to group."); return; }
    const key = "manual-" + Math.random().toString(36).slice(2, 10);
    const name = prompt("Family name for the grouped rows?") ?? "";
    if (!name.trim()) return;
    await groupFn({ data: { batchId, rowIds: [...sel], familyKey: key, familyName: name.trim() } });
    qc.invalidateQueries({ queryKey: ["cat-preview", batchId] });
    setSel(new Set());
  }

  const brandMut = useMutation({
    mutationFn: async () => {
      if (brandPick.mode === "existing" && !brandPick.brandId) throw new Error("Pick an existing brand.");
      if (brandPick.mode === "new" && !brandPick.name?.trim()) throw new Error("Enter a new brand name.");
      return brandFn({ data: { batchId, brandId: brandPick.mode === "existing" ? brandPick.brandId : null, newBrandName: brandPick.mode === "new" ? brandPick.name : null, applyToAllRows: true } });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["cat-preview", batchId] }); setMsg("Brand decision saved. Applied to every row."); },
    onError: (e: any) => setMsg(e.message),
  });

  const commitMut = useMutation({
    mutationFn: async () => commitFn({ data: { batchId } }),
    onSuccess: (r: any) => { setMsg(`Import committed: ${r.created_families} families, ${r.added_variants} variants added, ${r.updated_variants} updated, ${r.skipped} skipped.`); qc.invalidateQueries({ queryKey: ["cat-preview", batchId] }); qc.invalidateQueries({ queryKey: ["cat-batches"] }); },
    onError: (e: any) => setMsg(e.message),
  });

  const cancelMut = useMutation({ mutationFn: async () => cancelFn({ data: { batchId } }), onSuccess: () => { setMsg("Batch cancelled."); qc.invalidateQueries({ queryKey: ["cat-preview", batchId] }); } });
  const rbMut = useMutation({ mutationFn: async () => rbFn({ data: { batchId } }), onSuccess: (r: any) => { setMsg(`Rollback: ${r.reverted} reverted, ${r.skipped} skipped, ${r.failed} failed.`); qc.invalidateQueries({ queryKey: ["cat-preview", batchId] }); } });

  if (q.isLoading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (!batch) return <div className="text-sm text-red-600">Batch not found.</div>;

  const isEditable = batch.status === "previewed" || batch.status === "draft";
  const isCommitted = batch.status === "succeeded" || batch.status === "partially_rolled_back";
  const canRb = isCommitted && batch.rollback_expires_at && new Date(batch.rollback_expires_at) > new Date();

  const counts: Record<string, number> = { all: rows.length };
  for (const a of ACTIONS) counts[a] = rows.filter((r: any) => r.source_payload?.action === a).length;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl">Preview Import</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {batch.filename ?? "—"} · sheet <b>{preview.sheet ?? "?"}</b> · status {badge(batch.status)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/admin/catalogue/import" className="btn-outline text-sm">Back to imports</Link>
          {isEditable && <button onClick={() => { if (confirm("Cancel this import batch?")) cancelMut.mutate(); }} className="btn-outline text-sm">Cancel batch</button>}
          {canRb && <button onClick={() => { if (confirm("Roll back this import? Records edited after import will be skipped.")) rbMut.mutate(); }} className="btn-outline text-sm text-red-700"><RotateCcw className="h-3 w-3" /> Rollback</button>}
        </div>
      </div>

      {msg && <div className="mt-3 rounded-md bg-blue-50 p-2 text-xs text-blue-800">{msg}</div>}

      {/* Sheet & header summary */}
      <div className="card-surface mt-4 grid gap-3 bg-white p-4 text-xs md:grid-cols-4">
        <div><div className="text-muted-foreground">Header row</div><div className="font-medium">{preview.header_row != null ? preview.header_row + 1 : "?"}</div></div>
        <div><div className="text-muted-foreground">Stock ID column</div><div className="font-medium">{preview.stock_col != null ? preview.stock_col + 1 : "?"}</div></div>
        <div><div className="text-muted-foreground">Description column</div><div className="font-medium">{preview.desc_col != null ? preview.desc_col + 1 : "?"}</div></div>
        <div><div className="text-muted-foreground">Candidate rows / blank</div><div className="font-medium">{preview.candidate_row_count ?? 0} / {preview.blank_rows ?? 0}</div></div>
      </div>

      {/* Brand confirmation */}
      {isEditable && (
        <div className="card-surface mt-4 bg-white p-4">
          <h2 className="font-display text-lg">Brand confirmation</h2>
          <p className="mt-1 text-xs text-muted-foreground">Detected brand headings (never trusted automatically). Confirm the brand — a new brand is only created when the import is committed.</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {(preview.brand_candidates ?? []).map((c: any) => (
              <div key={c.normalized + c.sourceRow} className="rounded border border-border px-2 py-1">
                <span className="font-medium">{c.text}</span>
                <span className="text-muted-foreground"> (row {c.sourceRow + 1}, {c.confidence})</span>
                {c.existing_brand_id
                  ? <button onClick={() => setBrandPick({ mode: "existing", brandId: c.existing_brand_id })} className="ml-2 text-primary hover:underline">Use match: {c.existing_brand_name}</button>
                  : <button onClick={() => setBrandPick({ mode: "new", name: c.text.replace(/\s*[(\[].*?[)\]]\s*$/, "").trim() })} className="ml-2 text-primary hover:underline">Propose new: {c.text}</button>}
              </div>
            ))}
            {(preview.brand_candidates ?? []).length === 0 && <div className="text-muted-foreground">No brand headings detected. Pick manually below.</div>}
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div>
              <div className="text-xs font-medium">Existing brand</div>
              <input value={brandSearch} onChange={(e) => setBrandSearch(e.target.value)} placeholder="Search brands…" className="mt-1 h-8 w-full rounded border border-border px-2 text-sm" />
              {brandSearchQ.data && brandSearchQ.data.length > 0 && (
                <div className="mt-1 max-h-40 overflow-auto rounded border border-border bg-white text-xs">
                  {(brandSearchQ.data as any[]).map((b) => (
                    <button key={b.id} onClick={() => setBrandPick({ mode: "existing", brandId: b.id, name: b.name })} className="block w-full px-2 py-1 text-left hover:bg-muted">{b.name}</button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <div className="text-xs font-medium">Or propose a new brand</div>
              <input value={brandPick.mode === "new" ? brandPick.name ?? "" : ""} onChange={(e) => setBrandPick({ mode: "new", name: e.target.value })} placeholder="New brand name" className="mt-1 h-8 w-full rounded border border-border px-2 text-sm" />
              <p className="mt-1 text-[10px] text-muted-foreground">Created only on commit; nothing is inserted now.</p>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <div className="text-xs">
              Current decision: {decision
                ? decision.type === "existing"
                  ? <span className="font-medium">Use existing brand ({(brandSearchQ.data as any[])?.find(b => b.id === decision.brandId)?.name ?? decision.brandId.slice(0, 8) + "…"})</span>
                  : <span className="font-medium">Create new: {decision.newBrandName}</span>
                : <span className="text-red-700">Not confirmed</span>}
            </div>
            <button disabled={brandMut.isPending} onClick={() => brandMut.mutate()} className="btn-primary text-xs">
              {brandMut.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save brand & apply to all rows"}
            </button>
          </div>
        </div>
      )}

      {/* Filters + bulk */}
      <div className="mt-4 flex flex-wrap items-center gap-2 border-b border-border pb-2 text-xs">
        <button onClick={() => setFilter("all")} className={`rounded-full px-3 py-1 ${filter === "all" ? "bg-ink text-white" : "bg-muted"}`}>all ({counts.all})</button>
        {ACTIONS.map((a) => (
          <button key={a} onClick={() => setFilter(a)} className={`rounded-full px-3 py-1 ${filter === a ? "bg-ink text-white" : "bg-muted"}`}>{a} ({counts[a] ?? 0})</button>
        ))}
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search description or stock ID…" className="ml-2 h-7 rounded border border-border px-2 text-xs" />
        {isEditable && (
          <div className="ml-auto flex gap-1">
            <button onClick={() => bulkPatch({ include: true })} className="btn-outline text-xs" disabled={sel.size === 0}>Include selected</button>
            <button onClick={() => bulkPatch({ include: false, action: "skip" })} className="btn-outline text-xs" disabled={sel.size === 0}>Skip selected</button>
            <select onChange={(e) => e.target.value && bulkPatch({ product: { category: e.target.value } as any })} className="h-7 rounded border border-border px-1 text-xs" defaultValue="">
              <option value="">Bulk category…</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select onChange={(e) => e.target.value && bulkPatch({ product: { product_type_id: e.target.value } })} className="h-7 rounded border border-border px-1 text-xs" defaultValue="">
              <option value="">Bulk type…</option>
              {(lookups.data?.productTypes ?? []).map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <button onClick={groupSelected} className="btn-outline text-xs" disabled={sel.size < 2}><Users className="h-3 w-3" /> Group</button>
          </div>
        )}
      </div>

      {/* Rows */}
      <div className="mt-3 max-h-[65vh] overflow-auto">
        <table className="w-full text-xs">
          <thead className="text-[10px] uppercase text-muted-foreground">
            <tr>
              <th className="p-1"><input type="checkbox" onChange={(e) => setSel(e.target.checked ? new Set(filtered.map((r: any) => r.id)) : new Set())} /></th>
              <th className="p-1 text-left">#</th>
              <th className="p-1 text-left">Action</th>
              <th className="p-1 text-left">Include</th>
              <th className="p-1 text-left">Original ERP description</th>
              <th className="p-1 text-left">Family name</th>
              <th className="p-1 text-left">Category</th>
              <th className="p-1 text-left">Pack</th>
              <th className="p-1 text-left">Stock ID</th>
              <th className="p-1 text-left">Warnings</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r: any) => {
              const p = r.source_payload as any;
              const same = p.product?.family_key && filtered.filter((x: any) => x.source_payload?.product?.family_key === p.product.family_key).length > 1;
              return (
                <tr key={r.id} className={`border-t border-border align-top ${same ? "bg-amber-50/40" : ""}`}>
                  <td className="p-1"><input type="checkbox" checked={sel.has(r.id)} onChange={(e) => { const n = new Set(sel); if (e.target.checked) n.add(r.id); else n.delete(r.id); setSel(n); }} /></td>
                  <td className="p-1">{r.row_number}</td>
                  <td className="p-1">
                    {isEditable ? (
                      <select value={p.action} onChange={(e) => patchRow(r.id, { action: e.target.value })} className="rounded border border-border px-1 py-0.5 text-xs">
                        {ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                    ) : badge(p.action)}
                  </td>
                  <td className="p-1">{isEditable ? <input type="checkbox" checked={!!p.include} onChange={(e) => patchRow(r.id, { include: e.target.checked })} /> : (p.include ? "yes" : "no")}</td>
                  <td className="p-1 max-w-[240px]"><div className="line-clamp-2 text-[11px] text-muted-foreground" title={p.erp_description}>{p.erp_description}</div></td>
                  <td className="p-1">
                    {isEditable ? (
                      <input value={p.product?.name ?? ""} onChange={(e) => patchRow(r.id, { product: { name: e.target.value } })} className="w-40 rounded border border-border px-1 py-0.5 text-xs" />
                    ) : p.product?.name}
                    {same && <button onClick={async () => { await ungroupFn({ data: { batchId, rowId: r.id } }); qc.invalidateQueries({ queryKey: ["cat-preview", batchId] }); }} className="ml-1 text-[10px] text-primary hover:underline"><Ungroup className="inline h-3 w-3" /> ungroup</button>}
                  </td>
                  <td className="p-1">
                    {isEditable ? (
                      <>
                        <select value={p.product?.category ?? ""} onChange={(e) => patchRow(r.id, { product: { category: e.target.value || null } })} className="rounded border border-border px-1 py-0.5 text-xs">
                          <option value="">— pick —</option>
                          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <select value={p.product?.product_type_id ?? ""} onChange={(e) => patchRow(r.id, { product: { product_type_id: e.target.value || null } })} className="mt-1 block rounded border border-border px-1 py-0.5 text-xs">
                          <option value="">— type —</option>
                          {(lookups.data?.productTypes ?? []).filter((t: any) => !p.product?.category || t.category === p.product.category).map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      </>
                    ) : p.product?.category ?? "—"}
                  </td>
                  <td className="p-1">
                    {isEditable ? (
                      <>
                        <label className="flex items-center gap-1 text-[10px]">
                          <input type="checkbox" checked={!!p.variant?.no_pack_required} onChange={(e) => patchRow(r.id, { variant: { no_pack_required: e.target.checked } })} />
                          No pack required
                        </label>
                        {!p.variant?.no_pack_required && (
                          <div className="mt-1 flex gap-1">
                            <input type="number" step="0.01" value={p.variant?.pack_value ?? ""} onChange={(e) => patchRow(r.id, { variant: { pack_value: e.target.value ? Number(e.target.value) : null } })} className="w-14 rounded border border-border px-1 py-0.5 text-xs" placeholder="value" />
                            <select value={p.variant?.pack_unit_code ?? ""} onChange={(e) => patchRow(r.id, { variant: { pack_unit_code: e.target.value || null } })} className="rounded border border-border px-1 py-0.5 text-xs">
                              <option value="">unit</option>
                              {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                          </div>
                        )}
                        {p.variant?.no_pack_required && (
                          <input value={p.variant?.pack_label ?? ""} onChange={(e) => patchRow(r.id, { variant: { pack_label: e.target.value } })} className="mt-1 w-24 rounded border border-border px-1 py-0.5 text-[11px]" placeholder="e.g. Piece" />
                        )}
                      </>
                    ) : p.variant?.no_pack_required ? (p.variant.pack_label ?? "Standard Pack") : `${p.variant?.pack_value ?? "?"} ${p.variant?.pack_unit_code ?? ""}`}
                  </td>
                  <td className="p-1 font-mono text-[10px]">{p.erp_stock_id || "—"}</td>
                  <td className="p-1 text-[10px]">
                    {r.status !== "pending" && <div className="text-muted-foreground">status: {r.status}</div>}
                    {(p.warnings ?? []).map((w: string, i: number) => <div key={i} className="text-amber-700"><AlertTriangle className="inline h-3 w-3" /> {w}</div>)}
                    {r.error_message && <div className="text-red-700">{r.error_message}</div>}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && <tr><td colSpan={10} className="p-4 text-center text-muted-foreground">No rows match this filter.</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Confirm bar */}
      {isEditable && (
        <div className="sticky bottom-0 mt-4 rounded-t border-t-2 border-primary bg-white p-3 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground">
              Brand: {decision ? (decision.type === "existing" ? "existing selected" : `new "${decision.newBrandName}"`) : <span className="text-red-700">not confirmed</span>} · Included: {rows.filter((r: any) => r.source_payload?.include).length} · Needs review: {counts.needs_review ?? 0} · Invalid: {counts.invalid ?? 0}
            </div>
            <button disabled={commitMut.isPending || !decision} onClick={() => commitMut.mutate()} className="btn-primary text-sm">
              {commitMut.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Importing…</> : <><CheckCircle2 className="h-4 w-4" /> Confirm import</>}
            </button>
          </div>
          {!decision && <div className="mt-1 text-right text-[11px] text-red-700">Confirm the brand before importing.</div>}
        </div>
      )}
    </div>
  );
}
