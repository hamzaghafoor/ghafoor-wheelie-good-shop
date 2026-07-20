import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useMemo } from "react";
import { ChevronLeft, Plus, Trash2 } from "lucide-react";
import { getModelWithConfigs } from "@/lib/oem.functions";
import { listBrands } from "@/lib/brands.functions";
import { listPublishedFamilies, listRecommendations, upsertRecommendation, deleteRecommendation } from "@/lib/recommendations.functions";

export const Route = createFileRoute("/_authenticated/admin/vehicles/$modelId/recommendations")({
  component: RecPage,
});

const CATS = ["tyres","lubricants","filters","maintenance_parts","car_care","additives","accessories","services"] as const;
const GROUPS = [
  { v: "best_match", label: "Best Match" },
  { v: "premium", label: "Premium Option" },
  { v: "value", label: "Value Option" },
  { v: "alternative", label: "Alternative Brand" },
] as const;

const inp = "h-9 rounded border border-border bg-white px-2 text-sm w-full";

function RecPage() {
  const { modelId } = Route.useParams();
  const qc = useQueryClient();
  const loadModel = useServerFn(getModelWithConfigs);
  const loadBrands = useServerFn(listBrands);
  const loadFamilies = useServerFn(listPublishedFamilies);
  const loadRecs = useServerFn(listRecommendations);
  const save = useServerFn(upsertRecommendation);
  const del = useServerFn(deleteRecommendation);

  const model = useQuery({ queryKey: ["rec-model", modelId], queryFn: () => loadModel({ data: { modelId } }) });
  const brands = useQuery({ queryKey: ["rec-brands"], queryFn: () => loadBrands({ data: {} } as any) });
  const recs = useQuery({ queryKey: ["recs", modelId], queryFn: () => loadRecs({ data: { model_id: modelId } }) });

  const makeId = model.data?.model?.make_id;
  const [editing, setEditing] = useState<any | null>(null);

  const mSave = useMutation({
    mutationFn: (d: any) => save({ data: d }),
    onSuccess: () => { setEditing(null); qc.invalidateQueries({ queryKey: ["recs", modelId] }); },
  });
  const mDel = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recs", modelId] }),
  });

  // Warn if a category has only one brand covered when other brands publish products in that category
  const singleBrandWarnings = useMemo(() => {
    const rows = (recs.data ?? []) as any[];
    const byCat: Record<string, Set<string>> = {};
    rows.forEach((r) => {
      (byCat[r.category] ||= new Set()).add(r.brand_id);
    });
    return Object.entries(byCat).filter(([_c, s]) => s.size === 1).map(([c]) => c);
  }, [recs.data]);

  return (
    <div>
      <Link to="/admin/vehicles/$modelId" params={{ modelId }} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-3 w-3" /> Back to configurations
      </Link>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl">{model.data?.make?.name} {model.data?.model?.name} — Recommendations</h1>
          <p className="mt-1 text-sm text-muted-foreground">Curate product families (best match, premium, value, alternative) shown on the public vehicle page.</p>
        </div>
        <button
          onClick={() => makeId && setEditing({ make_id: makeId, model_id: modelId, category: "tyres", rec_group: "best_match", display_order: 0, is_active: true })}
          disabled={!makeId}
          className="btn-primary text-sm">
          <Plus className="h-4 w-4" /> Add recommendation
        </button>
      </div>

      {singleBrandWarnings.length > 0 && (
        <div className="mt-3 rounded-md bg-amber-50 p-2 text-xs text-amber-900">
          Only one brand is recommended for: <b>{singleBrandWarnings.join(", ")}</b>. Consider adding at least one alternative brand.
        </div>
      )}

      {recs.isLoading ? <div className="mt-6 text-sm text-muted-foreground">Loading…</div> :
       (recs.data ?? []).length === 0 ? (
        <div className="card-surface mt-6 bg-white p-8 text-center text-sm text-muted-foreground">
          No recommendations yet. Add one to guide customers.
        </div>
       ) : (
        <div className="mt-4 overflow-x-auto card-surface bg-white">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-2 text-left">Category</th>
                <th className="p-2 text-left">Group</th>
                <th className="p-2 text-left">Brand</th>
                <th className="p-2 text-left">Product family</th>
                <th className="p-2 text-left">Configuration</th>
                <th className="p-2 text-left">Label</th>
                <th className="p-2 text-left">Order</th>
                <th className="p-2 text-left">Active</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {(recs.data ?? []).map((r: any) => (
                <tr key={r.id} className={`border-t border-border ${r.is_active ? "" : "opacity-60"}`}>
                  <td className="p-2">{r.category.replace(/_/g," ")}</td>
                  <td className="p-2">{GROUPS.find((g) => g.v === r.rec_group)?.label ?? r.rec_group}</td>
                  <td className="p-2">{r.brand?.name ?? "—"}</td>
                  <td className="p-2">{r.family?.name ?? "—"}</td>
                  <td className="p-2 text-xs text-muted-foreground">{r.configuration_id ? "specific" : "any"}</td>
                  <td className="p-2 text-xs">{r.label ?? "—"}</td>
                  <td className="p-2 text-xs">{r.display_order}</td>
                  <td className="p-2 text-xs">{r.is_active ? "Yes" : "No"}</td>
                  <td className="p-2 text-right">
                    <button onClick={() => setEditing(r)} className="text-xs text-primary hover:underline">Edit</button>
                    <button onClick={() => confirm("Delete this recommendation?") && mDel.mutate(r.id)} className="ml-2 rounded p-1 hover:bg-muted"><Trash2 className="h-3.5 w-3.5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
       )}

      {editing && (
        <RecForm
          initial={editing}
          configs={model.data?.configs ?? []}
          brands={brands.data ?? []}
          onCancel={() => setEditing(null)}
          onSave={(d) => mSave.mutate(d)}
          busy={mSave.isPending}
          loadFamilies={loadFamilies}
        />
      )}
    </div>
  );
}

function RecForm({ initial, configs, brands, onCancel, onSave, busy, loadFamilies }: any) {
  const [f, setF] = useState<any>({ ...initial });
  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));

  const families = useQuery({
    queryKey: ["rec-fams", f.category, f.brand_id],
    queryFn: () => loadFamilies({ data: { category: f.category, brand_id: f.brand_id || null } }),
    enabled: !!f.category,
  });

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onCancel}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
        <h3 className="font-display text-lg">{f.id ? "Edit recommendation" : "New recommendation"}</h3>
        <p className="mt-1 text-xs text-muted-foreground">Recommendations point to product families. Customers pick the pack variant afterward.</p>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div><label className="block text-xs font-medium mb-1">Category</label>
            <select value={f.category} onChange={(e) => { set("category", e.target.value); set("brand_id", ""); set("product_family_id", ""); }} className={inp}>
              {CATS.map((c) => <option key={c} value={c}>{c.replace(/_/g," ")}</option>)}
            </select>
          </div>
          <div><label className="block text-xs font-medium mb-1">Configuration (optional)</label>
            <select value={f.configuration_id ?? ""} onChange={(e) => set("configuration_id", e.target.value || null)} className={inp}>
              <option value="">Any configuration</option>
              {configs.map((c: any) => <option key={c.id} value={c.id}>{[c.trim_name, c.engine_code, c.market].filter(Boolean).join(" · ")}</option>)}
            </select>
          </div>
          <div><label className="block text-xs font-medium mb-1">Brand</label>
            <select value={f.brand_id ?? ""} onChange={(e) => { set("brand_id", e.target.value); set("product_family_id", ""); }} className={inp}>
              <option value="">Select brand</option>
              {brands.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div><label className="block text-xs font-medium mb-1">Product family</label>
            <select value={f.product_family_id ?? ""} onChange={(e) => set("product_family_id", e.target.value)} className={inp}>
              <option value="">Select family</option>
              {(families.data ?? []).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div><label className="block text-xs font-medium mb-1">Group</label>
            <select value={f.rec_group} onChange={(e) => set("rec_group", e.target.value)} className={inp}>
              {GROUPS.map((g) => <option key={g.v} value={g.v}>{g.label}</option>)}
            </select>
          </div>
          <div><label className="block text-xs font-medium mb-1">Custom label (optional)</label>
            <input value={f.label ?? ""} onChange={(e) => set("label", e.target.value)} placeholder="Overrides group name" className={inp} />
          </div>
          <div><label className="block text-xs font-medium mb-1">Display order</label>
            <input type="number" min={0} value={f.display_order ?? 0} onChange={(e) => set("display_order", Number(e.target.value))} className={inp} />
          </div>
          <div className="flex items-end"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!f.is_active} onChange={(e) => set("is_active", e.target.checked)} className="accent-primary" /> Active</label></div>
          <div className="md:col-span-2"><label className="block text-xs font-medium mb-1">Admin notes (internal)</label>
            <textarea value={f.notes ?? ""} onChange={(e) => set("notes", e.target.value)} rows={2} className={`${inp} h-auto py-2`} />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-3">
          <button onClick={onCancel} className="text-sm text-muted-foreground">Cancel</button>
          <button disabled={busy || !f.brand_id || !f.product_family_id} onClick={() => onSave(f)} className="btn-primary text-sm disabled:opacity-50">
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
