import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listLookups, upsertProductType, archiveProductType, upsertPurposeLabel, archivePurposeLabel } from "@/lib/catalogue-cms.functions";
import { Archive, ArchiveRestore, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/catalogue/types")({
  component: TypesLabels,
});

const CATS = ["lubricants","filters","car_care","additives","accessories","maintenance_parts","services","tyres"] as const;
const inp = "h-9 w-full rounded-md border border-border bg-white px-2 text-sm";

function TypesLabels() {
  const qc = useQueryClient();
  const looks = useServerFn(listLookups);
  const upType = useServerFn(upsertProductType);
  const archType = useServerFn(archiveProductType);
  const upLabel = useServerFn(upsertPurposeLabel);
  const archLabel = useServerFn(archivePurposeLabel);
  const lookups = useQuery({ queryKey: ["cat-lookups"], queryFn: () => looks() });

  const [newType, setNewType] = useState({ name: "", parent_category: "lubricants", display_order: 0 });
  const [newLabel, setNewLabel] = useState({ label: "", type_id: "", display_order: 0 });
  const [err, setErr] = useState<string | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["cat-lookups"] });
  const mUpType = useMutation({ mutationFn: (v: any) => upType({ data: v }), onSuccess: invalidate, onError: (e: any) => setErr(e.message) });
  const mArchType = useMutation({ mutationFn: (v: any) => archType({ data: v }), onSuccess: invalidate, onError: (e: any) => setErr(e.message) });
  const mUpLabel = useMutation({ mutationFn: (v: any) => upLabel({ data: v }), onSuccess: invalidate, onError: (e: any) => setErr(e.message) });
  const mArchLabel = useMutation({ mutationFn: (v: any) => archLabel({ data: v }), onSuccess: invalidate });

  const types = lookups.data?.types ?? [];
  const labels = lookups.data?.labels ?? [];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {err && <div className="col-span-2 rounded-md bg-red-50 p-2 text-sm text-red-700">{err}</div>}

      {/* TYPES */}
      <div className="rounded-lg border border-border bg-white p-4">
        <h2 className="font-display text-lg">Product types</h2>
        <p className="mt-1 text-xs text-muted-foreground">Manage subcategories such as Engine Oil, Coolant, DPF Cleaner. Archive is blocked when active products still use the type.</p>
        <div className="mt-3 space-y-2">
          {types.map((t: any) => (
            <div key={t.id} className={`flex items-center gap-2 rounded-md border border-border p-2 ${t.archived ? "opacity-50" : ""}`}>
              <input defaultValue={t.name} onBlur={(e) => e.target.value !== t.name && mUpType.mutate({ id: t.id, name: e.target.value, parent_category: t.parent_category, display_order: t.display_order, is_active: t.is_active })} className={inp + " flex-1"} />
              <select defaultValue={t.parent_category} onChange={(e) => mUpType.mutate({ id: t.id, name: t.name, parent_category: e.target.value, display_order: t.display_order, is_active: t.is_active })} className={inp + " w-32"}>
                {CATS.map((c) => <option key={c} value={c}>{c.replace(/_/g," ")}</option>)}
              </select>
              <input type="number" defaultValue={t.display_order} onBlur={(e) => mUpType.mutate({ id: t.id, name: t.name, parent_category: t.parent_category, display_order: Number(e.target.value), is_active: t.is_active })} className={inp + " w-16"} />
              <label className="text-xs"><input type="checkbox" defaultChecked={t.is_active} onChange={(e) => mUpType.mutate({ id: t.id, name: t.name, parent_category: t.parent_category, display_order: t.display_order, is_active: e.target.checked })} className="accent-primary" /> active</label>
              <button onClick={() => mArchType.mutate({ id: t.id, archived: !t.archived })} className="rounded p-1 hover:bg-muted" title={t.archived ? "Restore" : "Archive"}>
                {t.archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
              </button>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-end gap-2 border-t border-border pt-3">
          <div className="flex-1"><div className="text-[11px] text-muted-foreground">New type name</div><input value={newType.name} onChange={(e) => setNewType({ ...newType, name: e.target.value })} className={inp} /></div>
          <div><div className="text-[11px] text-muted-foreground">Category</div><select value={newType.parent_category} onChange={(e) => setNewType({ ...newType, parent_category: e.target.value })} className={inp + " w-32"}>{CATS.map((c) => <option key={c} value={c}>{c.replace(/_/g," ")}</option>)}</select></div>
          <button onClick={() => { if (!newType.name.trim()) return; mUpType.mutate(newType); setNewType({ name: "", parent_category: newType.parent_category, display_order: 0 }); }} className="btn-primary text-xs flex items-center gap-1"><Plus className="h-3 w-3" /> Add</button>
        </div>
      </div>

      {/* LABELS */}
      <div className="rounded-lg border border-border bg-white p-4">
        <h2 className="font-display text-lg">Purpose labels</h2>
        <p className="mt-1 text-xs text-muted-foreground">Additive-purpose tags (Injector Cleaner, DPF Cleaner). Attach to a specific type or leave global.</p>
        <div className="mt-3 space-y-2">
          {labels.map((l: any) => (
            <div key={l.id} className={`flex items-center gap-2 rounded-md border border-border p-2 ${l.archived ? "opacity-50" : ""}`}>
              <input defaultValue={l.label} onBlur={(e) => e.target.value !== l.label && mUpLabel.mutate({ id: l.id, label: e.target.value, type_id: l.type_id, display_order: l.display_order, is_active: l.is_active })} className={inp + " flex-1"} />
              <select defaultValue={l.type_id ?? ""} onChange={(e) => mUpLabel.mutate({ id: l.id, label: l.label, type_id: e.target.value || null, display_order: l.display_order, is_active: l.is_active })} className={inp + " w-40"}>
                <option value="">Global</option>
                {types.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <input type="number" defaultValue={l.display_order} onBlur={(e) => mUpLabel.mutate({ id: l.id, label: l.label, type_id: l.type_id, display_order: Number(e.target.value), is_active: l.is_active })} className={inp + " w-16"} />
              <button onClick={() => mArchLabel.mutate({ id: l.id, archived: !l.archived })} className="rounded p-1 hover:bg-muted">
                {l.archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
              </button>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-end gap-2 border-t border-border pt-3">
          <div className="flex-1"><div className="text-[11px] text-muted-foreground">New label</div><input value={newLabel.label} onChange={(e) => setNewLabel({ ...newLabel, label: e.target.value })} className={inp} /></div>
          <div><div className="text-[11px] text-muted-foreground">Type</div><select value={newLabel.type_id} onChange={(e) => setNewLabel({ ...newLabel, type_id: e.target.value })} className={inp + " w-40"}><option value="">Global</option>{types.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
          <button onClick={() => { if (!newLabel.label.trim()) return; mUpLabel.mutate({ label: newLabel.label, type_id: newLabel.type_id || null, display_order: 0, is_active: true }); setNewLabel({ label: "", type_id: newLabel.type_id, display_order: 0 }); }} className="btn-primary text-xs flex items-center gap-1"><Plus className="h-3 w-3" /> Add</button>
        </div>
      </div>
    </div>
  );
}
